import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface RoleDefinition {
  name: string;
  badge: string;
  description: string;
  permissions: { [key: string]: boolean };
}

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div>
          <h1>Roles & Access Permissions (RBAC)</h1>
          <p>Granular capability control across administrators, moderators, premium members, and visitors.</p>
        </div>
      </div>

      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Access Admin</th>
              <th>Manage Media</th>
              <th>Moderate Reviews</th>
              <th>View Analytics</th>
              <th>Stream Ultra HD</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of roles">
              <td>
                <div class="role-desc">
                  <strong>{{ r.name }}</strong>
                  <span>{{ r.description }}</span>
                </div>
              </td>
              <td><span class="perm-check" [class.on]="r.permissions['admin']">{{ r.permissions['admin'] ? '✓' : '—' }}</span></td>
              <td><span class="perm-check" [class.on]="r.permissions['media']">{{ r.permissions['media'] ? '✓' : '—' }}</span></td>
              <td><span class="perm-check" [class.on]="r.permissions['reviews']">{{ r.permissions['reviews'] ? '✓' : '—' }}</span></td>
              <td><span class="perm-check" [class.on]="r.permissions['analytics']">{{ r.permissions['analytics'] ? '✓' : '—' }}</span></td>
              <td><span class="perm-check" [class.on]="r.permissions['stream']">{{ r.permissions['stream'] ? '✓' : '—' }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header h1 { font-size: 1.75rem; color: #ffffff; margin: 0; }
    .page-header p { color: #94a3b8; margin: 0.25rem 0 0; font-size: 0.9rem; }
    .table-card { background: rgba(17, 24, 39, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; }
    .data-table th { padding: 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; }
    .data-table td { padding: 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.04); color: #e2e8f0; }
    .role-desc { display: flex; flex-direction: column; }
    .role-desc strong { color: white; font-size: 0.95rem; }
    .role-desc span { font-size: 0.75rem; color: #94a3b8; }
    .perm-check { font-weight: 700; color: #64748b; font-size: 1.1rem; }
    .perm-check.on { color: #4ade80; }
  `]
})
export class AdminRolesComponent {
  roles: RoleDefinition[] = [
    {
      name: 'Super Administrator',
      badge: 'admin',
      description: 'Complete system access, user role modifications, settings & overrides',
      permissions: { admin: true, media: true, reviews: true, analytics: true, stream: true }
    },
    {
      name: 'Content Moderator',
      badge: 'mod',
      description: 'Review comments, report management, and media catalogue updates',
      permissions: { admin: true, media: true, reviews: true, analytics: false, stream: true }
    },
    {
      name: 'Registered Member',
      badge: 'user',
      description: 'Standard viewer with Watchlist, Favorites, and rating capabilities',
      permissions: { admin: false, media: false, reviews: false, analytics: false, stream: true }
    },
    {
      name: 'Guest Visitor',
      badge: 'guest',
      description: 'Public viewer browsing and streaming without persistent profile',
      permissions: { admin: false, media: false, reviews: false, analytics: false, stream: true }
    }
  ];
}
