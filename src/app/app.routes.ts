import { Routes } from '@angular/router';
import { SiteComponent } from './components/site/site.component';
import { HomeComponent } from './components/home/home.component';
import { SettingsComponent } from './components/settings/settings.component';
import { AdminComponent } from './components/admin/admin.component';
import { ReportsComponent } from './components/reports/reports.component';
import { ScadaComponent } from './components/scada/scada.component';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { SiteManagementComponent } from './components/site-management/site-management.component';
import { SiteAdminComponent } from './components/site-admin/site-admin.component';
import { DeleteAccountComponent } from './components/delete-account/delete-account.component';
import { PrivacyPolicyComponent } from './components/privacy-policy/privacy-policy.component';

export const routes: Routes = [
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'site/:id', component: SiteComponent, canActivate: [authGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
  { path: 'reports', component: ReportsComponent, canActivate: [authGuard] },
  { path: 'scada', component: ScadaComponent, canActivate: [authGuard] },
  { path: 'site-management', component: SiteManagementComponent, canActivate: [adminGuard] },
  { path: 'site-admin', component: SiteAdminComponent, canActivate: [adminGuard] },
  { path: 'delete-account', component: DeleteAccountComponent },
  { path: 'privacy-policy', component: PrivacyPolicyComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' }
];
