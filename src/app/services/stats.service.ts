import { Injectable } from '@angular/core';

export interface WatchStats {
  dailyWatchTime: number;
  weeklyWatchTime: number;
  lastUpdated: string;
  dailyHistory: number[];
  weeklyHistory: number[];
}

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  private getCurrentDate(): Date {
    const now = new Date();
    // Convert to local timezone's midnight
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private getDateInTimezone(dateString: string): Date {
    const date = new Date(dateString);
    // Convert to local timezone's midnight
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  async checkDateChanges() {
    const result = await chrome.storage.local.get('watchStats');
    const stats = result['watchStats'] as WatchStats;
    
    if (!stats) return;

    const lastUpdated = this.getDateInTimezone(stats.lastUpdated);
    const currentDate = this.getCurrentDate();

    if (!this.isSameDay(lastUpdated, currentDate) || !this.isSameWeek(lastUpdated, currentDate)) {
      await this.updateHistoricalData(stats, lastUpdated, currentDate);
    }
  }

  async getStats(): Promise<WatchStats> {
    const result = await chrome.storage.local.get('watchStats');
    return result['watchStats'] as WatchStats;
  }

  async getSettings() {
    const result = await chrome.storage.sync.get('netflixSettings');
    return result['netflixSettings'];
  }

  formatTime(minutes: number): string {
    if (minutes >= 120) {
      return `${(minutes / 60).toFixed(1)}h`;
    }
    return `${Math.round(minutes)}m`;
  }

  getBarHeight(value: number, maxValue: number): number {
    return maxValue ? (value / maxValue) * 100 : 0;
  }

  getDayLabels(): string[] {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date().getDay();
    // Return days in user's timezone
    return Array(7).fill(0).map((_, i) => {
      const index = (today - i + 7) % 7;
      return days[index];
    });
  }

  private async updateHistoricalData(stats: WatchStats, lastUpdated: Date, currentDate: Date) {
    if (!this.isSameDay(lastUpdated, currentDate)) {
      // Calculate days difference in user's timezone
      const daysDiff = Math.floor(
        (currentDate.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      for (let i = 0; i < Math.min(daysDiff, 7); i++) {
        stats.dailyHistory.unshift(0);
      }
      stats.dailyHistory = stats.dailyHistory.slice(0, 7);
      stats.dailyWatchTime = 0;
    }

    if (!this.isSameWeek(lastUpdated, currentDate)) {
      // Calculate weeks difference in user's timezone
      const weeksDiff = Math.floor(
        (currentDate.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24 * 7)
      );
      
      for (let i = 0; i < Math.min(weeksDiff, 5); i++) {
        stats.weeklyHistory.unshift(0);
      }
      stats.weeklyHistory = stats.weeklyHistory.slice(0, 5);
      stats.weeklyWatchTime = 0;
    }

    // Store date in ISO format but at midnight in user's timezone
    stats.lastUpdated = currentDate.toISOString();
    await chrome.storage.local.set({ watchStats: stats });
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    // Compare dates in user's timezone
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  private isSameWeek(date1: Date, date2: Date): boolean {
    // Get week number for dates in user's timezone
    const getWeekNumber = (date: Date) => {
      const d = new Date(date.getTime());
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      const yearStart = new Date(d.getFullYear(), 0, 1);
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };
    
    return date1.getFullYear() === date2.getFullYear() &&
           getWeekNumber(date1) === getWeekNumber(date2);
  }
} 