var StatsManager = {
  getStats: async function() {
    var today = new Date().toISOString().split('T')[0];
    var defaultStats = {
      blocked: 0,
      resisted: 0,
      continued: 0,
      lastResetDate: today
    };
    
    var data = await StorageManager.get({ stats: defaultStats });
    var stats = data.stats;
    
    // Daily reset logic
    if (stats.lastResetDate !== today) {
      stats.blocked = 0;
      stats.resisted = 0;
      stats.continued = 0;
      stats.lastResetDate = today;
      await this.saveStats(stats);
    }
    return stats;
  },
  
  saveStats: async function(stats) {
    await StorageManager.set({ stats: stats });
  },
  
  increment: async function(type) {
    var stats = await this.getStats();
    if (stats[type] !== undefined) {
      stats[type]++;
      await this.saveStats(stats);
    }
  }
};
