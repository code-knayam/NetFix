import { Component } from '@angular/core';
import { StatsComponent } from './stats/stats.component';
import { SettingsComponent } from './settings/settings.component';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [StatsComponent, SettingsComponent, MatTabsModule],
})
export class AppComponent {
  activeTab = 0;
}
