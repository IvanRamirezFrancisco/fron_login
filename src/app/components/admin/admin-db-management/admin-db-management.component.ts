import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminBackupsComponent }    from '../admin-backups/admin-backups.component';
import { AdminDbMonitoringComponent }  from './tabs/admin-db-monitoring/admin-db-monitoring.component';
import { AdminDbMaintenanceComponent } from './tabs/admin-db-maintenance/admin-db-maintenance.component';
import { AdminDbQueriesComponent }     from './tabs/admin-db-queries/admin-db-queries.component';

export type DbTab = 'backups' | 'monitoring' | 'maintenance' | 'queries';

interface TabDef {
  value: DbTab;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-admin-db-management',
  standalone: true,
  imports: [
    CommonModule,
    AdminBackupsComponent,
    AdminDbMonitoringComponent,
    AdminDbMaintenanceComponent,
    AdminDbQueriesComponent,
  ],
  templateUrl: './admin-db-management.component.html',
  styleUrl:    './admin-db-management.component.css',
})
export class AdminDbManagementComponent {

  activeTab: DbTab = 'backups';

  readonly tabs: TabDef[] = [
    { value: 'backups',     label: 'Respaldos',        icon: 'backup'        },
    { value: 'monitoring',  label: 'Monitoreo',         icon: 'monitor_heart' },
    { value: 'maintenance', label: 'Mantenimiento',     icon: 'build_circle'  },
    { value: 'queries',     label: 'Consultas Lentas',  icon: 'speed'         },
  ];

  changeTab(tab: DbTab): void {
    this.activeTab = tab;
  }
}
