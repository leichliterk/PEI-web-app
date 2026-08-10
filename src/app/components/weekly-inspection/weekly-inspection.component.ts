import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { UserService } from '../../services/user.service';
import { TenantService, TenantSite } from '../../services/tenant.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-weekly-inspection',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    SelectModule,
    SelectButtonModule,
    DatePickerModule,
    TextareaModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './weekly-inspection.component.html',
  styleUrl: './weekly-inspection.component.scss',
})
export class WeeklyInspectionComponent implements OnInit {
  sites: TenantSite[] = [];
  saving = false;

  readonly yesNoOptions = [
    { label: 'Yes', value: true },
    { label: 'No',  value: false },
  ];

  readonly extinguisherOptions = [
    { label: 'OK',          value: 'ok' },
    { label: 'Overcharged', value: 'overcharged' },
  ];

  locationStatus: 'pending' | 'acquiring' | 'granted' | 'denied' = 'pending';

  form = {
    site:                      null as TenantSite | null,
    technician:                '',
    date:                      new Date(),
    latitude:                  null as number | null,
    longitude:                 null as number | null,

    // Checkboxes
    equipmentInspected:        false,
    alarmsVerified:            false,
    propaneLeakCheck:          false,

    // Readings
    flameArrestorDiff:         null as number | null,
    kimreFilterDiff:           null as number | null,
    blowerDischargeTemp:       null as number | null,
    mineGasTemp:               null as number | null,
    mineGasPressure:           null as number | null,
    methane:                   null as number | null,
    gasFlow:                   null as number | null,
    flareTemp:                 null as number | null,

    // Other
    fireExtinguisher:          null as string | null,
    nitrogenTank:              null as number | null,
    meterReading:              null as number | null,
    suppliesNeeded:            '',
    logBookEntry:              null as boolean | null,

    // Sign-off
    signedBy:                  '',
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private userService: UserService,
    private tenantService: TenantService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.acquireLocation();

    const appUser = this.userService.appUserValue;
    if (appUser) {
      this.form.technician = `${appUser.fname} ${appUser.lname}`;

      this.tenantService.getTenantById(appUser.tenant_id).subscribe({
        next: tenant => {
          const allowed = new Set(appUser.site_ids);
          this.sites = tenant.sites.filter(s => allowed.has(s.site_id));
          if (this.sites.length === 1) {
            this.form.site = this.sites[0];
          }
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load sites' });
        },
      });
    }
  }

  acquireLocation(): void {
    if (!navigator.geolocation) {
      this.locationStatus = 'denied';
      return;
    }
    this.locationStatus = 'acquiring';
    navigator.geolocation.getCurrentPosition(
      pos => {
        this.form.latitude  = parseFloat(pos.coords.latitude.toFixed(6));
        this.form.longitude = parseFloat(pos.coords.longitude.toFixed(6));
        this.locationStatus = 'granted';
      },
      () => {
        this.locationStatus = 'denied';
        this.messageService.add({
          severity: 'warn',
          summary: 'Location Required',
          detail: 'Please enable location access in your browser to submit this inspection.',
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  get formValid(): boolean {
    return !!(
      this.form.site &&
      this.form.technician.trim() &&
      this.form.signedBy.trim() &&
      this.form.latitude !== null &&
      this.form.longitude !== null
    );
  }

  submit(): void {
    if (!this.formValid) return;
    this.saving = true;
    const payload = {
      type:      'weekly',
      site_id:   this.form.site!.site_id,
      site_name: this.form.site!.name,
      date:      this.form.date,
      location:  { latitude: this.form.latitude, longitude: this.form.longitude },
      technician: this.form.technician.trim(),
      signed_by: this.form.signedBy.trim(),
      weekly: {
        equipment_inspected:    this.form.equipmentInspected,
        alarms_verified:        this.form.alarmsVerified,
        flame_arrestor_diff:    this.form.flameArrestorDiff,
        kimre_filter_diff:      this.form.kimreFilterDiff,
        blower_discharge_temp:  this.form.blowerDischargeTemp,
        mine_gas_temp:          this.form.mineGasTemp,
        mine_gas_pressure:      this.form.mineGasPressure,
        methane_pct:            this.form.methane,
        gas_flow_scfm:          this.form.gasFlow,
        flare_temp:             this.form.flareTemp,
        fire_extinguisher:      this.form.fireExtinguisher,
        propane_leak_check:     this.form.propaneLeakCheck,
        nitrogen_tank_psi:      this.form.nitrogenTank,
        meter_reading_kwh:      this.form.meterReading,
        supplies_needed:        this.form.suppliesNeeded.trim() || null,
        log_book_entry:         this.form.logBookEntry,
      },
    };
    this.http.post(`${environment.API_SERVER}/inspection/weekly`, payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Inspection submitted' });
        setTimeout(() => this.router.navigate(['/inspections']), 1200);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to submit inspection' });
        this.saving = false;
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/inspections']);
  }
}
