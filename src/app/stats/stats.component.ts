import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface WatchStats {
  dailyWatchTime: number;
  weeklyWatchTime: number;
  longestSession: number;
  dailyHistory: number[];
  weeklyHistory: number[];
  lastUpdated: string;
}

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class StatsComponent implements OnInit {
  dailyProgress = 0;
  weeklyProgress = 0;
  longestSession = 0;
  dailyWatchTime = 0;
  weeklyWatchTime = 0;
  dailyHistory: number[] = [];
  weeklyHistory: number[] = [];
  showAnimation = false;
  refreshInterval: any;

  // Helper getters for historical data display
  get lastWeekDays(): string[] {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date().getDay();
    return Array(7).fill(0).map((_, i) => {
      const index = (today - i + 7) % 7;
      return days[index];
    });
  }

  get maxDailyValue(): number {
    return Math.max(...this.dailyHistory, this.dailyWatchTime);
  }

  get maxWeeklyValue(): number {
    return Math.max(...this.weeklyHistory, this.weeklyWatchTime);
  }

  async ngOnInit() {
    await this.loadStats();
    setTimeout(() => {
      this.showAnimation = true;
    }, 100);

    this.refreshInterval = setInterval(() => {
      this.loadStats();
    }, 10000);
  }

  async loadStats() {
    const stats = await chrome.storage.local.get('watchStats');
    const settings = await chrome.storage.sync.get('netflixSettings');

    if (stats['watchStats'] && settings['netflixSettings']) {
      const watchStats: WatchStats = stats['watchStats'];
      this.dailyWatchTime = watchStats.dailyWatchTime;
      this.weeklyWatchTime = watchStats.weeklyWatchTime;
      this.dailyHistory = watchStats.dailyHistory;
      this.weeklyHistory = watchStats.weeklyHistory;
      this.dailyProgress =
        (this.dailyWatchTime / settings['netflixSettings']['dailyLimit']) * 100;
      this.weeklyProgress =
        (this.weeklyWatchTime / settings['netflixSettings']['weeklyLimit']) * 100;
      this.longestSession = Math.round(watchStats.longestSession || 0);
    }
  }

  formatTime(minutes: number): string {
    if (minutes >= 120) {
      return `${(minutes / 60).toFixed(1)}h`;
    }
    return `${Math.round(minutes)}m`;
  }

  // Calculate height percentage for bar charts
  getBarHeight(value: number, maxValue: number): number {
    return maxValue ? (value / maxValue) * 100 : 0;
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}
