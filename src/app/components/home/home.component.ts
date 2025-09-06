import { Component, OnInit } from '@angular/core';
import { SiteService, Site } from '../../services/site.service';
import { SiteComponent } from '../site/site.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, SiteComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  sites: Site[] = [];

  constructor(private siteService: SiteService) { }

  ngOnInit(): void {
    this.siteService.getAllSites().subscribe({
      next: (sites) => {
        console.log('Sites data:', sites);
        this.sites = sites;
      },
      error: (error) => {
        console.error('Error fetching sites:', error);
      }
    });
  }

}
