import { Routes } from '@angular/router';
import { SiteComponent } from './components/site/site.component';
import { HomeComponent } from './components/home/home.component';

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'site', component: SiteComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' }
];
