import { Routes } from '@angular/router';
import { SiteComponent } from './components/site/site.component';
import { HomeComponent } from './components/home/home.component';
import { SettingsNotificationsComponent } from './components/settings-notifications/settings-notifications.component';
import { SiteReleaseMgmtComponent } from './components/site-release-mgmt/site-release-mgmt.component';
import { DailyDestructionReportComponent } from './components/daily-destruction-report/daily-destruction-report.component';
import { ScadaComponent } from './components/scada/scada.component';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { SiteManagementComponent } from './components/site-management/site-management.component';
import { TenantAdminComponent } from './components/tenant-admin/tenant-admin.component';
import { UserAdminComponent } from './components/user-admin/user-admin.component';
import { UserCreateComponent } from './components/user-create/user-create.component';
import { DeleteAccountComponent } from './components/delete-account/delete-account.component';
import { PrivacyPolicyComponent } from './components/privacy-policy/privacy-policy.component';

export const routes: Routes = [
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'site/:id', component: SiteComponent, canActivate: [authGuard] },
  { path: 'settings', component: SettingsNotificationsComponent, canActivate: [authGuard] },
  { path: 'site-release-mgmt', component: SiteReleaseMgmtComponent, canActivate: [adminGuard] },
  { path: 'daily-destruction-report', component: DailyDestructionReportComponent, canActivate: [authGuard] },
  { path: 'scada', component: ScadaComponent, canActivate: [authGuard] },
  { path: 'site-management', component: SiteManagementComponent, canActivate: [adminGuard] },
  { path: 'tenant-admin', component: TenantAdminComponent, canActivate: [adminGuard] },
  { path: 'user-admin', component: UserAdminComponent, canActivate: [adminGuard] },
  { path: 'user-create', component: UserCreateComponent, canActivate: [adminGuard] },
  { path: 'delete-account', component: DeleteAccountComponent },
  { path: 'privacy-policy', component: PrivacyPolicyComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' }
];
