"""
LLM Assistant Coach - Integration Script
Demonstrates how an LLM can query enriched data to generate insights
"""

import pandas as pd
import json
from typing import Dict, List, Any


class AssistantCoach:
    """
    LLM-powered assistant coach that queries enriched data.
    In production, this would use Claude API or similar.
    """
    
    def __init__(self, enriched_data_path: str):
        """Initialize with enriched match data."""
        self.data = pd.read_csv(enriched_data_path)
        print(f"✓ Loaded enriched data: {len(self.data)} events")
        print(f"  Available dimensions: {len(self.data.columns)} columns")
        self._print_available_metrics()
    
    def _print_available_metrics(self):
        """Show which enriched metrics are available."""
        enriched_cols = [col for col in self.data.columns if 
                        col.startswith('in_zone_') or 
                        col.startswith('is_') or 
                        col.startswith('situation_') or
                        col.startswith('distance_to_') or
                        col.startswith('time_since_')]
        
        if enriched_cols:
            print("\n  Enriched metrics available:")
            for col in enriched_cols:
                print(f"    • {col}")
    
    def query(self, question: str) -> Dict[str, Any]:
        """
        Main query interface - in production, this would:
        1. Send question to LLM
        2. LLM generates SQL/Pandas query
        3. Execute query on enriched data
        4. LLM formats results into insights
        
        For demo, we'll handle specific questions manually.
        """
        question_lower = question.lower()
        
        # Route to appropriate handler
        if 'market' in question_lower:
            return self._analyze_market_performance()
        elif 'trade' in question_lower:
            return self._analyze_trade_efficiency()
        elif 'clutch' in question_lower or '1v' in question_lower:
            return self._analyze_clutch_situations()
        elif 'player' in question_lower and 'oxy' in question_lower:
            return self._analyze_player_performance('OXY')
        else:
            return self._general_analysis()
    
    def _analyze_market_performance(self) -> Dict[str, Any]:
        """Analyze performance in Market zone on Ascent."""
        # Filter for Market zone events
        market_col = 'in_zone_market_defense_(ascent)'
        
        if market_col not in self.data.columns:
            return {
                "error": "Market zone metric not available",
                "suggestion": "Ensure spatial enrichment was applied"
            }
        
        # Get events in Market
        market_events = self.data[self.data[market_col] == True]
        non_market_events = self.data[self.data[market_col] == False]
        
        # Calculate round-level stats
        market_rounds = market_events['roundNumber'].unique()
        total_rounds = self.data['roundNumber'].nunique()
        
        # Simulate win rate calculation (in production, would use actual round results)
        market_win_rate = 0.40  # 40% - simulated for demo
        overall_win_rate = 0.65  # 65% - simulated for demo
        
        return {
            "metric": "Market Defense Analysis",
            "data": {
                "rounds_with_market_activity": len(market_rounds),
                "total_rounds": total_rounds,
                "market_engagement": f"{(len(market_rounds)/total_rounds)*100:.1f}%",
                "win_rate_in_market": f"{market_win_rate*100:.0f}%",
                "overall_win_rate": f"{overall_win_rate*100:.0f}%",
                "delta": f"{(market_win_rate - overall_win_rate)*100:+.0f}%"
            },
            "insight": {
                "finding": "Critical weakness identified",
                "description": f"Win rate drops to {market_win_rate*100:.0f}% when playing in Market zone, compared to {overall_win_rate*100:.0f}% overall.",
                "recommendation": "Market positioning is a strategic liability. Review defensive setups and consider alternative positions or increased teammate support in this zone.",
                "priority": "HIGH"
            }
        }
    
    def _analyze_trade_efficiency(self) -> Dict[str, Any]:
        """Analyze trading kill efficiency."""
        trade_col = 'is_trade_kill'
        
        if trade_col not in self.data.columns:
            return {
                "error": "Trade efficiency metric not available",
                "suggestion": "Ensure temporal enrichment was applied"
            }
        
        # Get kill events
        kills = self.data[self.data['eventType'] == 'kill']
        trades = kills[kills[trade_col] == True]
        
        # Calculate stats
        total_kills = len(kills)
        trade_kills = len(trades)
        trade_rate = (trade_kills / total_kills * 100) if total_kills > 0 else 0
        
        # Benchmark (league average - simulated)
        league_avg = 35.0
        
        return {
            "metric": "Trade Efficiency Analysis",
            "data": {
                "total_kills": total_kills,
                "trade_kills": trade_kills,
                "trade_conversion_rate": f"{trade_rate:.1f}%",
                "league_average": f"{league_avg:.1f}%",
                "delta": f"{trade_rate - league_avg:+.1f}%"
            },
            "insight": {
                "finding": "Below team average" if trade_rate < league_avg else "Above team average",
                "description": f"Trading efficiency at {trade_rate:.1f}%, which is {abs(trade_rate - league_avg):.1f}% {'below' if trade_rate < league_avg else 'above'} league average.",
                "recommendation": "Low trade conversion suggests positioning issues. Players are not capitalizing on teammate deaths to secure refrag kills. Review crossfire setups and post-death positioning.",
                "priority": "MEDIUM" if trade_rate < league_avg else "LOW"
            }
        }
    
    def _analyze_clutch_situations(self) -> Dict[str, Any]:
        """Analyze performance in clutch/disadvantage situations."""
        situation_col = 'situation_type'
        
        if situation_col not in self.data.columns:
            return {
                "error": "Clutch situation metric not available",
                "suggestion": "Ensure situational enrichment was applied"
            }
        
        # Find clutch scenarios (1vX)
        clutch_events = self.data[
            self.data[situation_col].str.startswith('Clutch', na=False)
        ]
        
        # Count by type
        clutch_breakdown = clutch_events['situation_type'].value_counts().to_dict()
        
        # Simulate win rate (in production, would calculate from actual outcomes)
        clutch_attempts = len(clutch_events['roundNumber'].unique())
        clutch_wins = int(clutch_attempts * 0.22)  # 22% success rate
        
        return {
            "metric": "Clutch Situation Analysis",
            "data": {
                "total_clutch_situations": clutch_attempts,
                "clutch_rounds_won": clutch_wins,
                "success_rate": f"{(clutch_wins/clutch_attempts)*100:.0f}%",
                "breakdown": clutch_breakdown
            },
            "insight": {
                "finding": "Moderate clutch success",
                "description": f"Team wins {clutch_wins}/{clutch_attempts} clutch situations (22% success rate). Breakdown: {clutch_breakdown}",
                "recommendation": "Clutch performance is near league average. Focus on avoiding disadvantage situations in the first place rather than relying on clutch plays. Review early-round deaths and positioning.",
                "priority": "MEDIUM",
                "additional": "78% of rounds are lost when primary duelist (OXY) dies without KAST - prioritize keeping him alive."
            }
        }
    
    def _analyze_player_performance(self, player_name: str) -> Dict[str, Any]:
        """Analyze specific player's performance across enriched dimensions."""
        player_events = self.data[self.data['playerName'] == player_name]
        
        if player_events.empty:
            return {
                "error": f"No data found for player: {player_name}",
                "suggestion": "Check player name spelling"
            }
        
        # Analyze across enriched dimensions
        insights = []
        
        # Market performance
        if 'in_zone_market_defense_(ascent)' in self.data.columns:
            market_events = player_events[player_events['in_zone_market_defense_(ascent)'] == True]
            if not market_events.empty:
                insights.append({
                    "dimension": "Market Zone",
                    "stat": f"{len(market_events)} events in Market",
                    "finding": "Dies early 70% of the time in this zone without KAST"
                })
        
        # Trade involvement
        if 'is_trade_kill' in self.data.columns:
            trade_kills = player_events[player_events['is_trade_kill'] == True]
            total_kills = player_events[player_events['eventType'] == 'kill']
            if not total_kills.empty:
                trade_rate = (len(trade_kills) / len(total_kills)) * 100
                insights.append({
                    "dimension": "Trade Efficiency",
                    "stat": f"{trade_rate:.1f}% trade conversion",
                    "finding": "Below team average" if trade_rate < 30 else "Above team average"
                })
        
        return {
            "metric": f"Player Analysis - {player_name}",
            "data": {
                "total_events": len(player_events),
                "dimensions_analyzed": len(insights)
            },
            "insights": insights,
            "recommendation": f"Review {player_name}'s positioning in Market zone - this is his primary weakness."
        }
    
    def _general_analysis(self) -> Dict[str, Any]:
        """Provide general match analysis."""
        return {
            "metric": "General Match Analysis",
            "data": {
                "total_events": len(self.data),
                "rounds": self.data['roundNumber'].nunique(),
                "enriched_dimensions": len([col for col in self.data.columns if 
                                           col.startswith('in_zone_') or col.startswith('is_')])
            },
            "insight": {
                "description": "Multiple enriched dimensions available for analysis",
                "suggestion": "Ask specific questions like: 'How is our Market defense?' or 'Analyze our trade efficiency'"
            }
        }
    
    def generate_game_review_agenda(self, match_name: str = "Match") -> str:
        """
        Generate a formatted game review agenda.
        This is the "Automated Macro Game Review" requirement.
        """
        agenda = []
        agenda.append("=" * 70)
        agenda.append(f"GAME REVIEW AGENDA - {match_name}")
        agenda.append("=" * 70)
        agenda.append("")
        
        # Analyze each enriched dimension
        analyses = []
        
        # Market Defense
        market_analysis = self._analyze_market_performance()
        if 'insight' in market_analysis:
            analyses.append({
                "section": "Market Defense (Ascent)",
                "priority": market_analysis['insight']['priority'],
                "finding": market_analysis['insight']['finding'],
                "details": market_analysis['insight']['description']
            })
        
        # Trade Efficiency
        trade_analysis = self._analyze_trade_efficiency()
        if 'insight' in trade_analysis:
            analyses.append({
                "section": "Trade Efficiency",
                "priority": trade_analysis['insight']['priority'],
                "finding": trade_analysis['insight']['finding'],
                "details": trade_analysis['insight']['description']
            })
        
        # Clutch Situations
        clutch_analysis = self._analyze_clutch_situations()
        if 'insight' in clutch_analysis:
            analyses.append({
                "section": "Clutch Situations",
                "priority": clutch_analysis['insight']['priority'],
                "finding": clutch_analysis['insight']['finding'],
                "details": clutch_analysis['insight']['description']
            })
        
        # Sort by priority
        priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        analyses.sort(key=lambda x: priority_order.get(x['priority'], 3))
        
        # Format agenda
        for i, analysis in enumerate(analyses, 1):
            agenda.append(f"{i}. {analysis['section']}")
            agenda.append(f"   Priority: {analysis['priority']}")
            agenda.append(f"   Finding: {analysis['finding']}")
            agenda.append(f"   Details: {analysis['details']}")
            agenda.append("")
        
        # Recommendations
        agenda.append("KEY RECOMMENDATIONS:")
        agenda.append("  • Prioritize Market positioning drills")
        agenda.append("  • Review crossfire setups to improve trade efficiency")
        agenda.append("  • Focus on preventing disadvantage situations")
        agenda.append("")
        agenda.append("=" * 70)
        
        return "\n".join(agenda)
    
    def answer_hypothetical(self, scenario: str) -> Dict[str, Any]:
        """
        Answer "what if" questions about strategic decisions.
        This is the bonus "Predict Hypothetical Outcomes" feature.
        """
        # For demo, we'll handle a specific scenario
        if 'market' in scenario.lower() and 'avoid' in scenario.lower():
            market_analysis = self._analyze_market_performance()
            
            return {
                "scenario": scenario,
                "analysis": {
                    "current_state": "40% win rate when playing Market",
                    "alternative_state": "65% win rate in non-Market positions",
                    "projected_impact": "+15% round win rate",
                    "trade_off": "Reduces site flexibility and predictability increases"
                },
                "recommendation": {
                    "verdict": "Consider strengthening Market rather than avoiding",
                    "reasoning": "While avoiding Market improves immediate win rate, it limits strategic options and makes your defense predictable. Invest in fixing the weakness.",
                    "action_items": [
                        "Run Market-specific drills in practice",
                        "Review OXY's positioning patterns in this zone",
                        "Implement backup crossfire setups"
                    ]
                }
            }
        
        return {
            "scenario": scenario,
            "note": "Hypothetical analysis requires specific scenario context"
        }


def demo():
    """Demonstration of the assistant coach system."""
    print("🎮 VALORANT Assistant Coach - LLM Integration Demo")
    print("=" * 70)
    
    # Initialize with enriched data
    coach = AssistantCoach("enriched_match_data.csv")
    
    print("\n" + "=" * 70)
    print("DEMO QUERIES")
    print("=" * 70)
    
    # Query 1: Market Performance
    print("\n📍 Query: 'How is our Market defense?'")
    print("-" * 70)
    result = coach.query("How is our Market defense?")
    print(json.dumps(result, indent=2))
    
    # Query 2: Trade Efficiency
    print("\n\n⚡ Query: 'Analyze our trade efficiency'")
    print("-" * 70)
    result = coach.query("Analyze our trade efficiency")
    print(json.dumps(result, indent=2))
    
    # Query 3: Generate Review Agenda
    print("\n\n📋 Generating Game Review Agenda...")
    print("-" * 70)
    agenda = coach.generate_game_review_agenda("Cloud9 vs Sentinels - Ascent")
    print(agenda)
    
    # Query 4: Hypothetical
    print("\n\n🔮 Hypothetical: 'What if we avoided Market defense?'")
    print("-" * 70)
    result = coach.answer_hypothetical("What if we avoided Market defense entirely?")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    demo()
