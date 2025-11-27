import { Routes } from '@angular/router';
import { SiteComponent } from './components/site/site.component';
import { HomeComponent } from './components/home/home.component';
import { SettingsComponent } from './components/settings/settings.component';

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'site', component: SiteComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' }
];
