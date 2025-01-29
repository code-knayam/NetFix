import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsService, WatchStats } from '../services/stats.service';

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
  dailyWatchTime = 0;
  weeklyWatchTime = 0;
  dailyHistory: number[] = [];
  weeklyHistory: number[] = [];
  showAnimation = false;
  refreshInterval: any;

  constructor(private statsService: StatsService) {}

  get lastWeekDays(): string[] {
    return this.statsService.getDayLabels();
  }

  get maxDailyValue(): number {
    return Math.max(...this.dailyHistory, this.dailyWatchTime);
  }

  get maxWeeklyValue(): number {
    return Math.max(...this.weeklyHistory, this.weeklyWatchTime);
  }

  async ngOnInit() {
    await this.statsService.checkDateChanges();
    await this.loadStats();
    setTimeout(() => {
      this.showAnimation = true;
    }, 100);

    this.refreshInterval = setInterval(() => {
      this.loadStats();
    }, 10000);
  }

  async loadStats() {
    const stats = await this.statsService.getStats();
    const settings = await this.statsService.getSettings();

    if (stats && settings) {
      this.updateStatsDisplay(stats, settings);
    }
  }

  private updateStatsDisplay(stats: WatchStats, settings: any) {
    this.dailyWatchTime = stats.dailyWatchTime;
    this.weeklyWatchTime = stats.weeklyWatchTime;
    this.dailyHistory = stats.dailyHistory;
    this.weeklyHistory = stats.weeklyHistory;
    this.dailyProgress = (this.dailyWatchTime / settings.dailyLimit) * 100;
    this.weeklyProgress = (this.weeklyWatchTime / settings.weeklyLimit) * 100;
  }

  formatTime(minutes: number): string {
    return this.statsService.formatTime(minutes);
  }

  getBarHeight(value: number, maxValue: number): number {
    return this.statsService.getBarHeight(value, maxValue);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}
