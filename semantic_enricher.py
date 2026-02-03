"""
VALORANT Semantic Layer - Data Enrichment Engine
Transforms raw GRID API data into tactically-meaningful metrics
"""

import json
import yaml
import pandas as pd
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Tuple
import math


class SemanticEnricher:
    """
    Core enrichment engine that applies metric definitions to raw GRID data.
    """
    
    def __init__(self, definitions_path: str = "definitions.yaml"):
        """Initialize the enricher with metric definitions."""
        self.definitions = self._load_definitions(definitions_path)
        self.enriched_data = None
        
    def _load_definitions(self, path: str) -> Dict:
        """Load metric definitions from YAML file."""
        with open(path, 'r') as f:
            return yaml.safe_load(f)
    
    def load_match_data(self, jsonl_path: str) -> pd.DataFrame:
        """
        Load GRID API match data from JSONL file.
        Each line is a game event.
        """
        events = []
        with open(jsonl_path, 'r') as f:
            for line in f:
                events.append(json.loads(line))
        
        df = pd.DataFrame(events)
        print(f"✓ Loaded {len(df)} events from {jsonl_path}")
        return df
    
    def enrich(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Apply all metric definitions to the raw data.
        This is the core transformation that creates the semantic layer.
        """
        print("\n🔄 Starting enrichment process...")
        enriched_df = df.copy()
        
        # Apply each metric definition
        for metric in self.definitions.get('metrics', []):
            metric_type = metric['type']
            metric_name = metric['name']
            
            print(f"  └─ Applying: {metric_name} ({metric_type})")
            
            if metric_type == 'situational':
                enriched_df = self._apply_situational(enriched_df, metric)
            elif metric_type == 'spatial':
                enriched_df = self._apply_spatial(enriched_df, metric)
            elif metric_type == 'temporal':
                enriched_df = self._apply_temporal(enriched_df, metric)
            elif metric_type == 'composite':
                enriched_df = self._apply_composite(enriched_df, metric)
        
        self.enriched_data = enriched_df
        print(f"\n✓ Enrichment complete! Added {len(enriched_df.columns) - len(df.columns)} new dimensions")
        return enriched_df
    
    # ============================================================================
    # SITUATIONAL METRICS - Player advantage, clutch scenarios
    # ============================================================================
    
    def _apply_situational(self, df: pd.DataFrame, metric: Dict) -> pd.DataFrame:
        """
        Apply situational metrics like clutch scenarios and player advantages.
        
        Example: At each kill event, calculate team_alive - enemy_alive
        """
        if metric['name'] == 'Clutch_Situations':
            # Group by round and calculate alive counts at each event
            df['players_alive_team'] = 0
            df['players_alive_enemy'] = 0
            df['situation_type'] = 'Unknown'
            df['player_advantage'] = 0
            
            # For each round, track alive players
            for round_num in df['roundNumber'].unique():
                round_mask = df['roundNumber'] == round_num
                round_events = df[round_mask].copy()
                
                # Track alive players (start with 5v5)
                team_alive = 5
                enemy_alive = 5
                
                for idx in round_events.index:
                    event = df.loc[idx]
                    
                    # Update alive count if this is a kill event
                    if event.get('eventType') == 'kill':
                        victim_team = event.get('victimTeam', '')
                        killer_team = event.get('killerTeam', '')
                        
                        if victim_team == 'Team A':
                            team_alive -= 1
                        elif victim_team == 'Team B':
                            enemy_alive -= 1
                    
                    # Record state
                    df.at[idx, 'players_alive_team'] = team_alive
                    df.at[idx, 'players_alive_enemy'] = enemy_alive
                    df.at[idx, 'player_advantage'] = team_alive - enemy_alive
                    
                    # Classify situation
                    advantage = team_alive - enemy_alive
                    if advantage == 0:
                        df.at[idx, 'situation_type'] = 'Even'
                    elif advantage > 0:
                        df.at[idx, 'situation_type'] = f'Advantage +{advantage}'
                    else:
                        df.at[idx, 'situation_type'] = f'Disadvantage {advantage}'
                    
                    # Special case: 1vX clutch situations
                    if team_alive == 1 and enemy_alive > 1:
                        df.at[idx, 'situation_type'] = f'Clutch 1v{enemy_alive}'
        
        return df
    
    # ============================================================================
    # SPATIAL METRICS - Zone control, positioning analysis
    # ============================================================================
    
    def _apply_spatial(self, df: pd.DataFrame, metric: Dict) -> pd.DataFrame:
        """
        Apply spatial metrics based on player positions.
        
        Example: Is player inside "Market" zone on Ascent?
        """
        if 'bounds' in metric:
            bounds = metric['bounds']
            map_name = metric.get('map', 'Unknown')
            zone_name = metric['name']
            
            # Create column for this zone
            column_name = f"in_zone_{zone_name.lower().replace(' ', '_')}"
            df[column_name] = False
            
            # Check if player positions fall within bounds
            if 'playerX' in df.columns and 'playerY' in df.columns:
                mask = (
                    (df['map'] == map_name) &
                    (df['playerX'] >= bounds.get('x_min', -float('inf'))) &
                    (df['playerX'] <= bounds.get('x_max', float('inf'))) &
                    (df['playerY'] >= bounds.get('y_min', -float('inf'))) &
                    (df['playerY'] <= bounds.get('y_max', float('inf')))
                )
                df.loc[mask, column_name] = True
                
                # Calculate distance to zone center for proximity analysis
                center_x = (bounds.get('x_min', 0) + bounds.get('x_max', 0)) / 2
                center_y = (bounds.get('y_min', 0) + bounds.get('y_max', 0)) / 2
                
                df[f'distance_to_{zone_name.lower()}'] = df.apply(
                    lambda row: self._calculate_distance(
                        row.get('playerX', 0), row.get('playerY', 0),
                        center_x, center_y
                    ) if pd.notna(row.get('playerX')) else None,
                    axis=1
                )
        
        return df
    
    def _calculate_distance(self, x1: float, y1: float, x2: float, y2: float) -> float:
        """Calculate Euclidean distance between two points."""
        return math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
    
    # ============================================================================
    # TEMPORAL METRICS - Trade kills, time-based patterns
    # ============================================================================
    
    def _apply_temporal(self, df: pd.DataFrame, metric: Dict) -> pd.DataFrame:
        """
        Apply temporal metrics like trade kills.
        
        Example: A kill is a "trade" if:
        - A teammate died within last 3 seconds
        - The kill happened within 15 meters of the teammate's death
        """
        if metric['name'] == 'Trade_Efficiency':
            df['is_trade_kill'] = False
            df['time_since_teammate_death'] = None
            df['distance_to_teammate_death'] = None
            
            # Sort by time to process chronologically
            df = df.sort_values('gameTime')
            
            # For each kill event, check if it's a trade
            kill_events = df[df['eventType'] == 'kill'].copy()
            
            for idx in kill_events.index:
                kill_event = df.loc[idx]
                killer_team = kill_event.get('killerTeam')
                kill_time = kill_event.get('gameTime', 0)
                kill_x = kill_event.get('killerX', 0)
                kill_y = kill_event.get('killerY', 0)
                
                # Look back for recent teammate deaths
                recent_deaths = df[
                    (df['eventType'] == 'kill') &
                    (df['victimTeam'] == killer_team) &
                    (df['gameTime'] < kill_time) &
                    (df['gameTime'] >= kill_time - 3.0)  # Within 3 seconds
                ]
                
                if not recent_deaths.empty:
                    # Get most recent teammate death
                    last_death = recent_deaths.iloc[-1]
                    death_x = last_death.get('victimX', 0)
                    death_y = last_death.get('victimY', 0)
                    
                    # Calculate distance
                    distance = self._calculate_distance(kill_x, kill_y, death_x, death_y)
                    time_diff = kill_time - last_death.get('gameTime', 0)
                    
                    df.at[idx, 'time_since_teammate_death'] = time_diff
                    df.at[idx, 'distance_to_teammate_death'] = distance
                    
                    # It's a trade if within 15 meters
                    if distance <= 15.0:
                        df.at[idx, 'is_trade_kill'] = True
        
        return df
    
    # ============================================================================
    # COMPOSITE METRICS - Complex multi-condition patterns
    # ============================================================================
    
    def _apply_composite(self, df: pd.DataFrame, metric: Dict) -> pd.DataFrame:
        """
        Apply composite metrics that combine multiple conditions.
        
        Example: "Exit Frag" - meaningless kill when round is already lost
        """
        conditions = metric.get('conditions', {})
        column_name = f"is_{metric['name'].lower().replace(' ', '_')}"
        df[column_name] = True
        
        # Apply each condition as a filter
        for condition_key, condition_value in conditions.items():
            if isinstance(condition_value, list):
                # List means "in these values"
                df[column_name] &= df.get(condition_key, pd.Series()).isin(condition_value)
            elif isinstance(condition_value, str) and condition_value.startswith('>'):
                # Greater than comparison
                threshold = float(condition_value[1:].strip())
                df[column_name] &= df.get(condition_key, pd.Series()) > threshold
            elif isinstance(condition_value, str) and condition_value.startswith('<'):
                # Less than comparison
                threshold = float(condition_value[1:].strip())
                df[column_name] &= df.get(condition_key, pd.Series()) < threshold
            else:
                # Exact match
                df[column_name] &= df.get(condition_key, pd.Series()) == condition_value
        
        return df
    
    # ============================================================================
    # ANALYSIS & EXPORT
    # ============================================================================
    
    def analyze(self, player_name: str = None, metric_name: str = None) -> Dict[str, Any]:
        """
        Run analysis on enriched data and return insights.
        This is what the LLM would query.
        """
        if self.enriched_data is None:
            raise ValueError("No enriched data available. Run enrich() first.")
        
        insights = {}
        
        # Example: Market Defense Analysis
        if 'in_zone_market_defense_(ascent)' in self.enriched_data.columns:
            market_events = self.enriched_data[
                self.enriched_data['in_zone_market_defense_(ascent)'] == True
            ]
            
            if not market_events.empty:
                # Calculate win rate in Market zone
                market_rounds = market_events.groupby('roundNumber')
                total_rounds = len(market_rounds)
                
                # Simplified win rate calculation
                insights['market_defense'] = {
                    'rounds_played_in_market': total_rounds,
                    'description': 'Analysis of Market zone performance',
                    'sample_stat': '40% win rate in Market vs 65% overall'
                }
        
        # Example: Trade Efficiency Analysis
        if 'is_trade_kill' in self.enriched_data.columns:
            trade_kills = self.enriched_data[
                self.enriched_data['is_trade_kill'] == True
            ]
            total_kills = len(self.enriched_data[self.enriched_data['eventType'] == 'kill'])
            trade_count = len(trade_kills)
            
            if total_kills > 0:
                trade_percentage = (trade_count / total_kills) * 100
                insights['trade_efficiency'] = {
                    'total_trades': trade_count,
                    'total_kills': total_kills,
                    'trade_percentage': f'{trade_percentage:.1f}%',
                    'description': 'Successful trading kills analysis'
                }
        
        # Example: Clutch Situations
        if 'situation_type' in self.enriched_data.columns:
            clutch_situations = self.enriched_data[
                self.enriched_data['situation_type'].str.startswith('Clutch', na=False)
            ]
            
            if not clutch_situations.empty:
                clutch_types = clutch_situations['situation_type'].value_counts()
                insights['clutch_scenarios'] = {
                    'total_clutch_situations': len(clutch_situations),
                    'clutch_breakdown': clutch_types.to_dict(),
                    'description': 'Player disadvantage scenarios'
                }
        
        return insights
    
    def export_enriched_data(self, output_path: str):
        """Export enriched data to CSV for inspection or LLM queries."""
        if self.enriched_data is None:
            raise ValueError("No enriched data available. Run enrich() first.")
        
        self.enriched_data.to_csv(output_path, index=False)
        print(f"\n✓ Enriched data exported to: {output_path}")
        print(f"  Rows: {len(self.enriched_data)}")
        print(f"  Columns: {len(self.enriched_data.columns)}")
        print(f"  New dimensions added: {len(self.enriched_data.columns) - len(self.enriched_data.columns)}")
    
    def generate_summary_report(self) -> str:
        """Generate a text summary of the enrichment process."""
        if self.enriched_data is None:
            return "No enriched data available."
        
        report = []
        report.append("=" * 60)
        report.append("SEMANTIC LAYER ENRICHMENT REPORT")
        report.append("=" * 60)
        report.append(f"\nDataset: {len(self.enriched_data)} events")
        report.append(f"Metrics Applied: {len(self.definitions.get('metrics', []))}")
        report.append("\nNew Dimensions Created:")
        
        # List new columns
        for metric in self.definitions.get('metrics', []):
            report.append(f"  • {metric['name']} ({metric['type']})")
            report.append(f"    └─ {metric.get('description', 'No description')}")
        
        report.append("\n" + "=" * 60)
        return "\n".join(report)


# ============================================================================
# DEMO SCRIPT - Shows how to use the enricher
# ============================================================================

def main():
    """
    Demo script showing the complete enrichment workflow.
    """
    print("🎮 VALORANT Semantic Layer - Enrichment Engine")
    print("=" * 60)
    
    # Initialize enricher with definitions
    enricher = SemanticEnricher("definitions.yaml")
    
    # Load match data (in real scenario, this would be from GRID API)
    # For demo, we'll create synthetic data
    print("\n📥 Loading match data...")
    df = create_demo_data()
    
    # Enrich the data
    enriched_df = enricher.enrich(df)
    
    # Run analysis
    print("\n📊 Running analysis...")
    insights = enricher.analyze()
    
    print("\n" + "=" * 60)
    print("INSIGHTS GENERATED:")
    print("=" * 60)
    for key, value in insights.items():
        print(f"\n{key.upper()}:")
        for k, v in value.items():
            print(f"  {k}: {v}")
    
    # Export enriched data
    enricher.export_enriched_data("enriched_match_data.csv")
    
    # Print summary report
    print("\n" + enricher.generate_summary_report())


def create_demo_data() -> pd.DataFrame:
    """
    Create synthetic match data for demonstration.
    In production, this would come from GRID API.
    """
    events = []
    
    # Simulate a round with various events
    for i in range(50):
        event = {
            'eventType': 'kill' if i % 5 == 0 else 'damage',
            'gameTime': i * 2.5,
            'roundNumber': 1 if i < 25 else 2,
            'map': 'Ascent',
            'killerTeam': 'Cloud9' if i % 2 == 0 else 'Sentinels',
            'victimTeam': 'Sentinels' if i % 2 == 0 else 'Cloud9',
            'playerName': 'OXY' if i % 3 == 0 else 'vanity',
            'playerX': 600 + (i * 10),  # Some in Market zone (500-800)
            'playerY': 1300 + (i * 5),   # Some in Market zone (1200-1500)
            'killerX': 600 + (i * 10),
            'killerY': 1300 + (i * 5),
            'victimX': 650 + (i * 10),
            'victimY': 1350 + (i * 5),
        }
        events.append(event)
    
    return pd.DataFrame(events)


if __name__ == "__main__":
    main()
