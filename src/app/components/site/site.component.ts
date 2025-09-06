import { Component, Input } from '@angular/core';
import { Site } from '../../services/site.service';

@Component({
  selector: 'app-site',
  standalone: true,
  imports: [],
  templateUrl: './site.component.html',
  styleUrl: './site.component.scss'
})
export class SiteComponent {
  @Input() siteData!: Site;
}
