import React, { useState, useEffect } from 'react';
import { Play, Plus, Download, Users, FileCode, Zap, Sparkles, Trash2, PlusCircle, ArrowRight, Map, Shield, User, X } from 'lucide-react';

export default function QueryBuilder() {
    const [activeTab, setActiveTab] = useState('predefined');
    const [customYaml, setCustomYaml] = useState(`# Define your custom metric
metrics:
  - name: "B_Site_Retake"
    type: "spatial_temporal"
    map: "Ascent"
    bounds: {x_min: 800, x_max: 1200, y_min: 600, y_max: 1000}
    player_count: "< 3"
    description: "Retaking B-site with disadvantage"`);

    const [analyzing, setAnalyzing] = useState(false);
    const [selectedMetrics, setSelectedMetrics] = useState(['clutch_situations']);
    const [analysisResult, setAnalysisResult] = useState(null);

    // --- Enhanced Builder State ---
    const [builderMode, setBuilderMode] = useState('visual');
    const [metricName, setMetricName] = useState('');
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Global Context
    const [globalContext, setGlobalContext] = useState({
        map: 'Ascent',
        side: 'Any', // Attacking, Defending
        tournament: 'Any',
        scoreGap: { operator: '=', value: 0 }
    });

    // Hierarchical Player Contexts
    const [playerContexts, setPlayerContexts] = useState([
        {
            id: 1,
            team: 'My Team', // My Team, Enemy Team
            targetType: 'Agent', // Agent, Player, Any
            targetValue: 'Jett',
            conditions: [
                { id: 1, type: 'State', field: 'alive', operator: 'is', value: true }
            ]
        }
    ]);

    // Data Sources (Mocked from API)
    const maps = ['Ascent', 'Bind', 'Haven', 'Icebox', 'Split', 'Lotus', 'Sunset'];
    const agents = ['Jett', 'Reyna', 'Raze', 'Sova', 'Omen', 'Viper', 'Killjoy', 'Cypher'];
    const sides = ['Any', 'Attacking', 'Defending'];
    const teams = ['My Team', 'Enemy Team'];

    const conditionTypes = {
        'State': [
            { value: 'alive', label: 'Is Alive', type: 'boolean' }, // from SegmentPlayerState.alive
            { value: 'currentHealth', label: 'Health', type: 'number', min: 0, max: 100 }, // from SegmentPlayerState.currentHealth
            { value: 'currentArmor', label: 'Armor', type: 'number', min: 0, max: 50 }, // from SegmentPlayerState.currentArmor
            { value: 'money', label: 'Money', type: 'number', min: 0, max: 9000 }, // from GamePlayerState.money
            { value: 'kills', label: 'Kill Total', type: 'number' },
            { value: 'deaths', label: 'Death Total', type: 'number' }
        ],
        'Abilities': [ // derived from Player.abilities
            { value: 'ability_ready', label: 'Ability Ready', type: 'select', options: ['Any', 'C - Ability 1', 'Q - Ability 2', 'E - Signature', 'X - Ultimate'] },
            { value: 'statusEffect', label: 'Status Effect', type: 'select', options: ['Any', 'Vulnerable', 'Blinded', 'Stunned', 'Suppressed'] } // from Player.statusEffects
        ],
        'Equipment': [ // derived from Player.inventory / weaponKills
            { value: 'has_weapon', label: 'Has Weapon', type: 'select', options: ['Any', 'Vandal', 'Phantom', 'Operator', 'Sheriff', 'Spectre'] },
            { value: 'loadoutValue', label: 'Loadout Value', type: 'number' }
        ],
        'Spatial': [ // derived from Player.position
            { value: 'region', label: 'Map Region', type: 'select', options: ['Any', 'A Site', 'B Site', 'Mid', 'Market', 'Main', 'Heaven'] }
        ]
    };

    // Sync to YAML
    useEffect(() => {
        if (builderMode === 'visual') {
            const contextBlocks = playerContexts.map(ctx => {
                const conditions = ctx.conditions
                    .filter(c => c.operator !== 'Any' && c.value !== 'Any')
                    .map(c => `        - ${c.field} ${c.operator} ${c.value}`)
                    .join('\n');

                return `    - target: ${ctx.targetType} (${ctx.targetValue})
      team: ${ctx.team}
      conditions:
${conditions || '        - any: true'}`;
            }).join('\n');

            const scoreGapStr = globalContext.scoreGap.operator === 'Any'
                ? 'any'
                : `"${globalContext.scoreGap.operator} ${globalContext.scoreGap.value}"`;

            const newYaml = `# Generated from Visual Builder
metrics:
  - name: "${metricName || 'Custom_Metric'}"
    global_context:
      map: "${globalContext.map}"
      side: "${globalContext.side}"
      score_gap: ${scoreGapStr}
    player_contexts:
${contextBlocks}`;
            setCustomYaml(newYaml);
        }
    }, [globalContext, playerContexts, metricName, builderMode]);


    // AI Handler
    const handleAiSuggest = () => {
        if (!aiPrompt) return;
        setIsAiLoading(true);

        // Mock AI to generate Hierarchical Context
        setTimeout(() => {
            setIsAiLoading(false);
            // Example response for "Jett with low health on A site"
            // In a real app, this would come from the LLM parsing the prompt

            // 1. Update Global
            setGlobalContext(prev => ({ ...prev, map: 'Ascent', side: 'Defending' }));

            // 2. Update Player Contexts
            setPlayerContexts([
                {
                    id: Date.now(),
                    team: 'Enemy Team',
                    targetType: 'Agent',
                    targetValue: 'Jett',
                    conditions: [
                        { id: 1, type: 'State', field: 'currentHealth', operator: '<', value: 30 },
                        { id: 2, type: 'State', field: 'alive', operator: 'is', value: true }
                    ]
                }
            ]);
            setMetricName("Low_Health_Jett_Defense");
        }, 1500);
    };

    // Handlers
    const addPlayerContext = () => {
        setPlayerContexts([...playerContexts, {
            id: Date.now(),
            team: 'My Team',
            targetType: 'Agent',
            targetValue: 'Jett',
            conditions: []
        }]);
    };

    const removePlayerContext = (id) => {
        setPlayerContexts(playerContexts.filter(c => c.id !== id));
    };

    const updatePlayerContext = (id, field, value) => {
        setPlayerContexts(playerContexts.map(c =>
            c.id === id ? { ...c, [field]: value } : c
        ));
    };

    const addConditionToContext = (contextId) => {
        setPlayerContexts(playerContexts.map(c =>
            c.id === contextId ? {
                ...c,
                conditions: [...c.conditions, {
                    id: Date.now(),
                    type: 'State',
                    field: 'health',
                    operator: '>',
                    value: 0
                }]
            } : c
        ));
    };

    const updateCondition = (contextId, conditionId, field, value) => {
        setPlayerContexts(playerContexts.map(ctx => {
            if (ctx.id !== contextId) return ctx;
            return {
                ...ctx,
                conditions: ctx.conditions.map(c => {
                    if (c.id !== conditionId) return c;

                    const newCond = { ...c, [field]: value };

                    // Reset value if field type changes
                    if (field === 'field') {
                        // Find type of new field
                        let newType = 'number'; // default
                        Object.values(conditionTypes).forEach(group => {
                            const found = group.find(g => g.value === value);
                            if (found) newType = found.type;
                        });

                        if (newType === 'boolean') {
                            newCond.operator = 'is';
                            newCond.value = true;
                        } else {
                            newCond.operator = '=';
                            newCond.value = 0;
                        }
                    }
                    return newCond;
                })
            };
        }));
    };

    const removeCondition = (contextId, conditionId) => {
        setPlayerContexts(playerContexts.map(ctx =>
            ctx.id === contextId ? {
                ...ctx,
                conditions: ctx.conditions.filter(c => c.id !== conditionId)
            } : ctx
        ));
    };

    const predefinedMetrics = [
        {
            id: 'clutch_situations',
            name: 'Clutch Situations',
            type: 'Situational',
            icon: '🎯',
            description: 'Tracks 1vX scenarios and player advantage states',
            logic: 'Calculates team_alive - enemy_alive at each kill event',
            color: 'bg-brand-500'
        },
        {
            id: 'market_defense',
            name: 'Market Defense (Ascent)',
            type: 'Spatial',
            icon: '📍',
            description: 'Win rate when defending from Market zone',
            logic: 'Bounding box: x[500-800], y[1200-1500]',
            color: 'bg-blue-500'
        },
        {
            id: 'trade_efficiency',
            name: 'Trade Efficiency',
            type: 'Temporal',
            icon: '⚡',
            description: 'Identifies successful trading kills',
            logic: 'Kill within 3s and 15m of teammate death',
            color: 'bg-green-500'
        }
    ];

    const communityQueries = [
        {
            name: 'Icebox A-Site Lurk',
            author: 'FaZe Coach',
            downloads: 342,
            description: 'Solo player holding A-site in last 30s of round'
        },
        {
            name: 'Haven Garage Control',
            author: 'Sentinels Analyst',
            downloads: 218,
            description: 'Early round garage control and win correlation'
        },
        {
            name: 'Post-Plant Positions',
            author: 'LOUD Strategy Team',
            downloads: 189,
            description: 'Optimal post-plant positioning analysis'
        }
    ];

    const toggleMetric = (metricId) => {
        setSelectedMetrics(prev =>
            prev.includes(metricId)
                ? prev.filter(id => id !== metricId)
                : [...prev, metricId]
        );
    };

    const runAnalysis = () => {
        setAnalyzing(true);
        setTimeout(() => {
            setAnalysisResult({
                match: 'Cloud9 vs Sentinels - Ascent',
                metrics: selectedMetrics.map(id => {
                    const metric = predefinedMetrics.find(m => m.id === id);
                    if (id === 'market_defense') {
                        return {
                            name: metric.name,
                            finding: 'Critical weakness identified',
                            stat: '40% win rate in Market (vs 65% overall)',
                            insight: 'OXY dies early 70% of the time in this zone without KAST'
                        };
                    } else if (id === 'trade_efficiency') {
                        return {
                            name: metric.name,
                            finding: 'Below team average',
                            stat: '15% trade conversion rate',
                            insight: '20% lower than league average - recommend reviewing positioning'
                        };
                    } else {
                        return {
                            name: metric.name,
                            finding: '1v3 clutch success',
                            stat: '22% win rate (2/9 attempts)',
                            insight: 'Team loses 78% of rounds when OXY dies without KAST'
                        };
                    }
                })
            });
            setAnalyzing(false);
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-900/40 to-slate-900 text-white p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Zap className="w-8 h-8 text-brand-400" />
                        <h1 className="text-4xl font-bold">VALORANT Semantic Layer</h1>
                    </div>
                    <p className="text-slate-300 text-lg">
                        Define tactical concepts. Query strategic insights. Build competitive advantage.
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-4 mb-6 border-b border-slate-700">
                    <button
                        onClick={() => setActiveTab('predefined')}
                        className={`px-6 py-3 font-semibold transition-all ${activeTab === 'predefined'
                            ? 'text-brand-400 border-b-2 border-brand-400'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Play className="w-4 h-4" />
                            Predefined Metrics
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('custom')}
                        className={`px-6 py-3 font-semibold transition-all ${activeTab === 'custom'
                            ? 'text-brand-400 border-b-2 border-brand-400'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Enhanced Builder
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('community')}
                        className={`px-6 py-3 font-semibold transition-all ${activeTab === 'community'
                            ? 'text-brand-400 border-b-2 border-brand-400'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Community Library
                        </div>
                    </button>
                </div>

                {/* Predefined Metrics Tab */}
                {activeTab === 'predefined' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                <FileCode className="w-6 h-6 text-brand-400" />
                                Available Metrics
                            </h2>
                            <div className="space-y-4">
                                {predefinedMetrics.map((metric) => (
                                    <div
                                        key={metric.id}
                                        onClick={() => toggleMetric(metric.id)}
                                        className={`p-6 rounded-lg border-2 transition-all cursor-pointer ${selectedMetrics.includes(metric.id)
                                            ? 'border-brand-400 bg-brand-900/30 shadow-lg shadow-brand-500/20'
                                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl">{metric.icon}</span>
                                                <div>
                                                    <h3 className="text-xl font-bold">{metric.name}</h3>
                                                    <span className={`text-xs px-2 py-1 rounded ${metric.color} bg-opacity-20 text-white`}>
                                                        {metric.type}
                                                    </span>
                                                </div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={selectedMetrics.includes(metric.id)}
                                                onChange={() => { }}
                                                className="w-5 h-5 accent-brand-500"
                                            />
                                        </div>
                                        <p className="text-slate-300 mb-2">{metric.description}</p>
                                        <code className="text-xs text-brand-300 bg-slate-900/50 px-2 py-1 rounded block">
                                            {metric.logic}
                                        </code>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={runAnalysis}
                                disabled={selectedMetrics.length === 0 || analyzing}
                                className={`mt-6 w-full py-4 rounded-lg font-bold text-lg transition-all ${selectedMetrics.length === 0 || analyzing
                                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-700 hover:to-cyan-700 shadow-lg shadow-brand-500/50'
                                    }`}
                            >
                                {analyzing ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Analyzing Match Data...
                                    </span>
                                ) : (
                                    `Run Analysis (${selectedMetrics.length} metrics selected)`
                                )}
                            </button>
                        </div>

                        {/* Analysis Results */}
                        <div>
                            <h2 className="text-2xl font-bold mb-4">Analysis Results</h2>
                            {!analysisResult ? (
                                <div className="bg-slate-800/50 border-2 border-slate-700 rounded-lg p-12 text-center">
                                    <div className="text-6xl mb-4">📊</div>
                                    <p className="text-slate-400 text-lg">
                                        Select metrics and run analysis to see insights
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-brand-500/30 rounded-lg p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                            <h3 className="text-xl font-bold">{analysisResult.match}</h3>
                                        </div>

                                        {analysisResult.metrics.map((metric, idx) => (
                                            <div key={idx} className="mb-6 last:mb-0">
                                                <div className="flex items-start gap-3 mb-2">
                                                    <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="text-lg font-bold text-brand-300">{metric.name}</h4>
                                                        <div className="mt-2 bg-slate-900/70 rounded p-4">
                                                            <div className="grid grid-cols-2 gap-4 mb-3">
                                                                <div>
                                                                    <span className="text-xs text-slate-400 uppercase">Finding</span>
                                                                    <p className="text-white font-semibold">{metric.finding}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-xs text-slate-400 uppercase">Stat</span>
                                                                    <p className="text-white font-semibold">{metric.stat}</p>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-slate-400 uppercase">Insight</span>
                                                                <p className="text-green-300 mt-1">{metric.insight}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                                        <p className="text-yellow-300 text-sm">
                                            💡 <strong>Coach Recommendation:</strong> Focus practice on Market positioning and early death prevention. Consider avoiding Market defense setups until addressed.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Enhanced Builder Tab */}
                {activeTab === 'custom' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold">Define Tactical Metric</h2>
                                <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                                    <button
                                        onClick={() => setBuilderMode('visual')}
                                        className={`px-3 py-1 text-sm rounded transition-all ${builderMode === 'visual' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        Builder
                                    </button>
                                    <button
                                        onClick={() => setBuilderMode('yaml')}
                                        className={`px-3 py-1 text-sm rounded transition-all ${builderMode === 'yaml' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        YAML
                                    </button>
                                </div>
                            </div>

                            {builderMode === 'visual' ? (
                                <div className="space-y-6">
                                    {/* AI Assistant Panel - RESTORED */}
                                    <div className="bg-gradient-to-r from-slate-800 to-brand-900/30 border border-brand-500/30 rounded-lg p-4 mb-6 animation-fade-in">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Sparkles className="w-5 h-5 text-brand-400" />
                                            <h3 className="font-bold text-brand-100">AI Metric Assistant</h3>
                                        </div>
                                        <p className="text-xs text-brand-300/70 mb-3">
                                            Describe a tactical situation to auto-configure your filters.
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={aiPrompt}
                                                onChange={(e) => setAiPrompt(e.target.value)}
                                                placeholder="e.g. 'Low health Jett on defense on A Site'"
                                                className="flex-1 bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm focus:border-brand-500 focus:outline-none placeholder-slate-500"
                                                onKeyDown={(e) => e.key === 'Enter' && handleAiSuggest()}
                                            />
                                            <button
                                                onClick={handleAiSuggest}
                                                disabled={isAiLoading || !aiPrompt}
                                                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors disabled:opacity-50"
                                            >
                                                {isAiLoading ? 'Thinking...' : 'Suggest'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Global Context */}
                                    <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                                        <h3 className="text-sm font-bold text-slate-300 uppercase mb-4 flex items-center gap-2">
                                            <Map className="w-4 h-4 text-brand-400" />
                                            Global Filters
                                        </h3>

                                        <div>
                                            <label className="block text-xs text-slate-400 uppercase font-bold mb-1">Metric Name</label>
                                            <input
                                                type="text"
                                                value={metricName}
                                                onChange={(e) => setMetricName(e.target.value)}
                                                placeholder="e.g. Jett_Entry_Success"
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-brand-500 focus:outline-none mb-4"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1">Map</label>
                                                <select
                                                    value={globalContext.map}
                                                    onChange={(e) => setGlobalContext({ ...globalContext, map: e.target.value })}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm"
                                                >
                                                    {maps.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1">Side</label>
                                                <select
                                                    value={globalContext.side}
                                                    onChange={(e) => setGlobalContext({ ...globalContext, side: e.target.value })}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm"
                                                >
                                                    {sides.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1">Score Gap</label>
                                                <div className="flex gap-2">
                                                    <select
                                                        value={globalContext.scoreGap.operator}
                                                        onChange={(e) => setGlobalContext({ ...globalContext, scoreGap: { ...globalContext.scoreGap, operator: e.target.value } })}
                                                        className="bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm w-20"
                                                    >
                                                        <option value="Any">Any</option>
                                                        <option value="=">=</option>
                                                        <option value=">">&gt;</option>
                                                        <option value="<">&lt;</option>
                                                    </select>
                                                    {globalContext.scoreGap.operator !== 'Any' && (
                                                        <input
                                                            type="number"
                                                            value={globalContext.scoreGap.value}
                                                            onChange={(e) => setGlobalContext({ ...globalContext, scoreGap: { ...globalContext.scoreGap, value: e.target.value } })}
                                                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Player Contexts */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-slate-300 uppercase flex items-center gap-2">
                                                <User className="w-4 h-4 text-green-400" />
                                                Player Contexts
                                            </h3>
                                            <button
                                                onClick={addPlayerContext}
                                                className="text-xs flex items-center gap-1 text-green-400 hover:text-green-300 font-semibold"
                                            >
                                                <PlusCircle className="w-3 h-3" />
                                                Add Context
                                            </button>
                                        </div>

                                        {playerContexts.map((ctx) => (
                                            <div key={ctx.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 relative">
                                                <button
                                                    onClick={() => removePlayerContext(ctx.id)}
                                                    className="absolute top-4 right-4 text-slate-500 hover:text-red-400"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>

                                                {/* Context Header */}
                                                <div className="flex flex-wrap gap-3 mb-4 items-center">
                                                    <span className="text-xs font-bold text-slate-500">I want to track</span>
                                                    <select
                                                        value={ctx.targetType}
                                                        onChange={(e) => updatePlayerContext(ctx.id, 'targetType', e.target.value)}
                                                        className="bg-slate-900 border border-green-500/30 text-green-300 rounded px-2 py-1 text-sm font-bold"
                                                    >
                                                        <option value="Agent">Agent</option>
                                                        <option value="Player">Player</option>
                                                        <option value="Any">Any Player</option>
                                                    </select>

                                                    {ctx.targetType === 'Agent' && (
                                                        <select
                                                            value={ctx.targetValue}
                                                            onChange={(e) => updatePlayerContext(ctx.id, 'targetValue', e.target.value)}
                                                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                                                        >
                                                            {agents.map(a => <option key={a} value={a}>{a}</option>)}
                                                        </select>
                                                    )}

                                                    <span className="text-xs font-bold text-slate-500">on</span>
                                                    <select
                                                        value={ctx.team}
                                                        onChange={(e) => updatePlayerContext(ctx.id, 'team', e.target.value)}
                                                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                                                    >
                                                        {teams.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>

                                                {/* Conditions */}
                                                <div className="pl-4 border-l-2 border-slate-700 space-y-2">
                                                    {ctx.conditions.map((cond) => {
                                                        // Find current type group
                                                        let currentGroup = 'State';
                                                        Object.entries(conditionTypes).forEach(([group, opts]) => {
                                                            if (opts.find(o => o.value === cond.field)) currentGroup = group;
                                                        });

                                                        const fieldConfig = conditionTypes[currentGroup].find(f => f.value === cond.field);

                                                        return (
                                                            <div key={cond.id} className="flex gap-2 items-center bg-slate-900/50 p-2 rounded">
                                                                <select
                                                                    value={currentGroup}
                                                                    onChange={(e) => {
                                                                        // Reset to first field of new group
                                                                        const newGroup = e.target.value;
                                                                        updateCondition(ctx.id, cond.id, 'field', conditionTypes[newGroup][0].value);
                                                                    }}
                                                                    className="bg-slate-900 text-slate-400 text-xs rounded px-2 py-1 border border-slate-700 w-24"
                                                                >
                                                                    {Object.keys(conditionTypes).map(k => <option key={k} value={k}>{k}</option>)}
                                                                </select>

                                                                <select
                                                                    value={cond.field}
                                                                    onChange={(e) => updateCondition(ctx.id, cond.id, 'field', e.target.value)}
                                                                    className="flex-1 bg-slate-900 text-white text-sm rounded px-2 py-1 border border-slate-700"
                                                                >
                                                                    {conditionTypes[currentGroup].map(f => (
                                                                        <option key={f.value} value={f.value}>{f.label}</option>
                                                                    ))}
                                                                </select>

                                                                {fieldConfig?.type === 'boolean' ? (
                                                                    <div className="flex-1 flex items-center gap-2">
                                                                        <select
                                                                            value={cond.value}
                                                                            onChange={(e) => updateCondition(ctx.id, cond.id, 'value', e.target.value === 'true')}
                                                                            className="bg-slate-900 text-white text-sm rounded px-2 py-1 border border-slate-700"
                                                                        >
                                                                            <option value="true">True</option>
                                                                            <option value="false">False</option>
                                                                            <option value="Any">Any</option>
                                                                        </select>
                                                                        <span className="text-xs text-slate-500 italic">condition</span>
                                                                    </div>
                                                                ) : fieldConfig?.type === 'select' ? (
                                                                    <div className="flex-1 flex gap-2">
                                                                        <select
                                                                            value={cond.operator}
                                                                            onChange={(e) => updateCondition(ctx.id, cond.id, 'operator', e.target.value)}
                                                                            className="bg-slate-900 text-purple-300 font-mono text-xs rounded px-2 py-1 border border-slate-700 w-16"
                                                                        >
                                                                            <option value="=">=</option>
                                                                            <option value="!=">!=</option>
                                                                            <option value="Any">Any</option>
                                                                        </select>
                                                                        {cond.operator !== 'Any' && (
                                                                            <select
                                                                                value={cond.value}
                                                                                onChange={(e) => updateCondition(ctx.id, cond.id, 'value', e.target.value)}
                                                                                className="flex-1 bg-slate-900 text-white text-sm rounded px-2 py-1 border border-slate-700"
                                                                            >
                                                                                {fieldConfig.options.map(opt => (
                                                                                    <option key={opt} value={opt}>{opt}</option>
                                                                                ))}
                                                                            </select>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <select
                                                                            value={cond.operator}
                                                                            onChange={(e) => updateCondition(ctx.id, cond.id, 'operator', e.target.value)}
                                                                            className="bg-slate-900 text-brand-300 font-mono text-sm rounded px-2 py-1 border border-slate-700 w-16"
                                                                        >
                                                                            <option value="Any">Any</option>
                                                                            <option value="=">=</option>
                                                                            <option value=">">&gt;</option>
                                                                            <option value="<">&lt;</option>
                                                                        </select>
                                                                        {cond.operator !== 'Any' && (
                                                                            <input
                                                                                type="number"
                                                                                value={cond.value}
                                                                                onChange={(e) => updateCondition(ctx.id, cond.id, 'value', e.target.value)}
                                                                                className="w-20 bg-slate-900 text-white font-mono text-sm rounded px-2 py-1 border border-slate-700"
                                                                            />
                                                                        )}
                                                                    </>
                                                                )}

                                                                <button
                                                                    onClick={() => removeCondition(ctx.id, cond.id)}
                                                                    className="text-slate-600 hover:text-red-400 p-1"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}

                                                    <button
                                                        onClick={() => addConditionToContext(ctx.id)}
                                                        className="text-xs flex items-center gap-1 text-slate-500 hover:text-purple-400 mt-2"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        Add Condition
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <textarea
                                    value={customYaml}
                                    onChange={(e) => setCustomYaml(e.target.value)}
                                    className="w-full h-96 bg-slate-900 border-2 border-slate-700 rounded-lg p-4 font-mono text-sm text-green-300 focus:border-purple-500 focus:outline-none"
                                    spellCheck={false}
                                />
                            )}

                            <button className="mt-4 w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2">
                                <Download className="w-5 h-5" />
                                Generate Metric & Run
                            </button>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-4">Metric Definition Guide</h2>
                            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-purple-300 mb-2">Hierarchical Logic</h3>
                                    <p className="text-slate-300 text-sm mb-4">
                                        Metrics are now defined by a global context (Match/Map) plus specific player contexts.
                                    </p>
                                    <div className="bg-slate-900 p-4 rounded text-xs text-green-300 font-mono">
                                        global:<br />
                                        &nbsp;&nbsp;map: Ascent<br />
                                        &nbsp;&nbsp;side: Attacking<br />
                                        contexts:<br />
                                        &nbsp;&nbsp;- target: Jett (My Team)<br />
                                        &nbsp;&nbsp;&nbsp;&nbsp;conditions:<br />
                                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- dashed: true<br />
                                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- health: &lt; 50
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Community Library Tab */}
                {activeTab === 'community' && (
                    <div>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-2">Community Query Library</h2>
                            <p className="text-slate-300">
                                Browse and import metrics shared by professional teams and analysts worldwide.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {communityQueries.map((query, idx) => (
                                <div
                                    key={idx}
                                    className="bg-slate-800/50 border-2 border-slate-700 rounded-lg p-6 hover:border-purple-500 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-lg font-bold group-hover:text-purple-300 transition-colors">
                                            {query.name}
                                        </h3>
                                        <Download className="w-5 h-5 text-slate-400 group-hover:text-purple-400" />
                                    </div>
                                    <p className="text-sm text-slate-400 mb-3">{query.description}</p>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500">by {query.author}</span>
                                        <span className="text-purple-400 font-semibold">{query.downloads} downloads</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-lg p-6">
                            <h3 className="text-xl font-bold mb-2">💡 Share Your Queries</h3>
                            <p className="text-slate-300">
                                Built a powerful metric? Share it with the community and help teams worldwide improve their strategic analysis.
                            </p>
                            <button className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-2 rounded-lg font-semibold transition-all">
                                Upload Query
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
