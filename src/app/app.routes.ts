import { Routes } from '@angular/router';
import { SiteComponent } from './components/site/site.component';
import { HomeComponent } from './components/home/home.component';
import { SettingsComponent } from './components/settings/settings.component';
import { AdminComponent } from './components/admin/admin.component';
import { ReportsComponent } from './components/reports/reports.component';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'site/:id', component: SiteComponent, canActivate: [authGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
  { path: 'reports', component: ReportsComponent, canActivate: [authGuard] },
  { path: '', redirectTo: '/home', pathMatch: 'full' }
];
