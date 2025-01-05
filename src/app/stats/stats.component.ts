import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  showAnimation = false;
  refreshInterval: any;

  async ngOnInit() {
    await this.loadStats();
    // Start animation after a short delay
    setTimeout(() => {
      this.showAnimation = true;
    }, 100);

    // Set up refresh interval (every minute)
    this.refreshInterval = setInterval(() => {
      this.loadStats();
    }, 10000);
  }

  async loadStats() {
    const stats = await chrome.storage.local.get('watchStats');
    const settings = await chrome.storage.sync.get('netflixSettings');

    if (stats['watchStats'] && settings['netflixSettings']) {
      this.dailyWatchTime = stats['watchStats']['dailyWatchTime'];
      this.weeklyWatchTime = stats['watchStats']['weeklyWatchTime'];
      this.dailyProgress =
        (this.dailyWatchTime / settings['netflixSettings']['dailyLimit']) * 100;
      this.weeklyProgress =
        (this.weeklyWatchTime / settings['netflixSettings']['weeklyLimit']) *
        100;
      this.longestSession = Math.round(
        stats['watchStats']['longestSession'] || 0
      );
    }
  }

  formatTime(minutes: number): string {
    if (minutes >= 120) {
      return `${(minutes / 60).toFixed(1)}h`;
    }
    return `${Math.round(minutes)}m`;
  }

  ngOnDestroy() {
    // Clear the interval when component is destroyed
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}
