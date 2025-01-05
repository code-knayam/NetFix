import { Component, OnInit } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: true,
  imports: [
    MatSlideToggleModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    FormsModule,
    CommonModule,
  ],
})
export class SettingsComponent implements OnInit {
  settings = {
    disableAutoplay: false,
    hideRecommendations: false,
    showEndTime: true,
    dailyLimit: 120,
    weeklyLimit: 600,
  };
  showSaveAnimation = false;

  async ngOnInit() {
    const result = await chrome.storage.sync.get('netflixSettings');
    if (result['netflixSettings']) {
      this.settings = { ...this.settings, ...result['netflixSettings'] };
    }
  }

  async saveSettings() {
    await chrome.storage.sync.set({ netflixSettings: this.settings });
    this.showSaveAnimation = true;
    setTimeout(() => (this.showSaveAnimation = false), 2000);
  }
}
