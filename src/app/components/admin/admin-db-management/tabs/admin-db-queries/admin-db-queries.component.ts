import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-db-queries',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-db-queries.component.html',
  styleUrls: ['../shared-tab.css'],
})
export class AdminDbQueriesComponent {
  /** Filas de ejemplo para el mockup visual */
  readonly mockRows = [
    { rank: 1, query: 'SELECT p.*, c.name FROM products p JOIN categories c ON...', calls: '—', avgMs: '—', totalMs: '—', rows: '—' },
    { rank: 2, query: 'SELECT o.*, u.email FROM orders o JOIN users u ON...', calls: '—', avgMs: '—', totalMs: '—', rows: '—' },
    { rank: 3, query: 'UPDATE products SET stock = stock - 1 WHERE id = ...', calls: '—', avgMs: '—', totalMs: '—', rows: '—' },
    { rank: 4, query: 'SELECT * FROM backup_logs ORDER BY created_at DESC LIMIT ...', calls: '—', avgMs: '—', totalMs: '—', rows: '—' },
    { rank: 5, query: 'INSERT INTO order_items (order_id, product_id, quantity)...', calls: '—', avgMs: '—', totalMs: '—', rows: '—' },
  ];
}
