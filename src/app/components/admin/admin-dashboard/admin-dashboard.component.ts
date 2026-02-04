import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface StatCard {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: string;
  color: string;
}

interface RecentOrder {
  id: string;
  customer: string;
  product: string;
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  date: Date;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  stats: StatCard[] = [
    {
      title: 'Ventas del Mes',
      value: '$125,430',
      change: '+12.5%',
      changeType: 'positive',
      icon: 'trending_up',
      color: '#27ae60'
    },
    {
      title: 'Órdenes Totales',
      value: '1,248',
      change: '+8.3%',
      changeType: 'positive',
      icon: 'shopping_cart',
      color: '#3498db'
    },
    {
      title: 'Productos',
      value: '342',
      change: '+23',
      changeType: 'positive',
      icon: 'inventory_2',
      color: '#9b59b6'
    },
    {
      title: 'Clientes',
      value: '892',
      change: '+45',
      changeType: 'positive',
      icon: 'people',
      color: '#e67e22'
    }
  ];

  recentOrders: RecentOrder[] = [
    {
      id: 'ORD-001',
      customer: 'Juan Pérez',
      product: 'Guitarra Acústica Yamaha',
      amount: 4500,
      status: 'completed',
      date: new Date()
    },
    {
      id: 'ORD-002',
      customer: 'María García',
      product: 'Piano Digital Roland',
      amount: 12500,
      status: 'pending',
      date: new Date()
    },
    {
      id: 'ORD-003',
      customer: 'Carlos López',
      product: 'Batería Electrónica Alesis',
      amount: 8900,
      status: 'completed',
      date: new Date()
    },
    {
      id: 'ORD-004',
      customer: 'Ana Martínez',
      product: 'Bajo Eléctrico Fender',
      amount: 6700,
      status: 'pending',
      date: new Date()
    },
    {
      id: 'ORD-005',
      customer: 'Luis Rodríguez',
      product: 'Amplificador Marshall',
      amount: 3200,
      status: 'cancelled',
      date: new Date()
    }
  ];

  topProducts = [
    { name: 'Guitarra Acústica Yamaha', sales: 145, revenue: 652500 },
    { name: 'Piano Digital Roland', sales: 89, revenue: 1112500 },
    { name: 'Batería Electrónica Alesis', sales: 67, revenue: 596300 },
    { name: 'Bajo Eléctrico Fender', sales: 54, revenue: 361800 },
    { name: 'Amplificador Marshall', sales: 42, revenue: 134400 }
  ];

  ngOnInit(): void {
    // Aquí cargarías los datos reales desde tu servicio
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'completed': 'status-completed',
      'pending': 'status-pending',
      'cancelled': 'status-cancelled'
    };
    return classes[status] || '';
  }

  getStatusText(status: string): string {
    const texts: { [key: string]: string } = {
      'completed': 'Completada',
      'pending': 'Pendiente',
      'cancelled': 'Cancelada'
    };
    return texts[status] || status;
  }
}
