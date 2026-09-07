import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { AppUser } from '../../../../models/user.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div>
          <h1>User Accounts & Access Management</h1>
          <p>Inspect registered user credentials, assign administrator roles, edit user profiles, and manage system access.</p>
        </div>
      </div>

      <div *ngIf="successMsg" class="alert-success">✓ {{ successMsg }}</div>
      <div *ngIf="errorMsg" class="alert-error">⚠️ {{ errorMsg }}</div>

      <!-- SEARCH & STATS TOOLBAR -->
      <div class="toolbar">
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search users by name or email..."
            [(ngModel)]="searchFilter"
            class="form-control"
          />
        </div>
        <div class="stats-summary">
          <span>Total Registered: <strong>{{ users.length }}</strong></span>
          <span class="sep">•</span>
          <span>Admins: <strong class="text-admin">{{ adminCount }}</strong></span>
          <span class="sep">•</span>
          <span>Standard Users: <strong>{{ users.length - adminCount }}</strong></span>
        </div>
      </div>

      <!-- USERS TABLE -->
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Current Role</th>
              <th>Last IP & ISP</th>
              <th>Location</th>
              <th>Device</th>
              <th>Joined Date</th>
              <th>Last Active</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of filteredUsers">
              <td>
                <div class="user-cell">
                  <div class="user-avatar" [class.admin-avatar]="isUserAdmin(u)">
                    {{ (u.displayName || u.email || 'U').charAt(0).toUpperCase() }}
                  </div>
                  <div class="user-name-col">
                    <strong>{{ u.displayName || 'No Name' }}</strong>
                  </div>
                </div>
              </td>
              <td>
                <span class="email-text">{{ u.email }}</span>
              </td>
              <td>
                <span *ngIf="isUserAdmin(u)" class="role-chip chip-admin">
                  🛡️ Admin
                </span>
                <span *ngIf="!isUserAdmin(u)" class="role-chip chip-user">
                  👤 User
                </span>
              </td>
              <td>
                <div class="user-ip-cell" *ngIf="u.lastIp; else noIp">
                  <span class="user-ip-text">{{ u.lastIp }}</span>
                  <span class="user-isp-text" *ngIf="u.lastIsp" [title]="u.lastIsp">⚡ {{ u.lastIsp }}</span>
                </div>
                <ng-template #noIp><span class="text-muted">—</span></ng-template>
              </td>
              <td>
                <div class="user-loc-cell" *ngIf="u.lastCountry || u.lastCity; else noLoc">
                  <span class="flag-icon">{{ u.lastFlag || '📍' }}</span>
                  <span>{{ u.lastCity ? u.lastCity + ', ' : '' }}{{ u.lastCountry }}</span>
                </div>
                <ng-template #noLoc><span class="text-muted">—</span></ng-template>
              </td>
              <td>
                <div class="user-dev-cell" *ngIf="u.lastDevice || u.lastOs; else noDev">
                  <span>{{ u.lastDevice === 'Mobile' ? '📱' : '💻' }} {{ u.lastDevice || 'Desktop' }}</span>
                  <span class="dev-sub" *ngIf="u.lastOs">{{ u.lastOs }} • {{ u.lastBrowser }}</span>
                </div>
                <ng-template #noDev><span class="text-muted">—</span></ng-template>
              </td>
              <td>{{ u.createdAt | date:'mediumDate' }}</td>
              <td>{{ u.lastLoginAt ? (u.lastLoginAt | date:'short') : 'N/A' }}</td>
              <td style="text-align: right;">
                <div class="action-btn-group">
                  <!-- TELEMETRY BUTTON -->
                  <button
                    class="btn-action-telemetry"
                    (click)="openTelemetryModal(u)"
                    title="Inspect Login Telemetry, ISP & Location"
                  >
                    🛰️
                  </button>

                  <!-- ROLE TOGGLE BUTTON -->
                  <button
                    class="btn-action-role"
                    [class.demote]="isUserAdmin(u)"
                    (click)="toggleRole(u)"
                    [title]="isUserAdmin(u) ? 'Demote Admin to User' : 'Assign Admin Role'"
                  >
                    {{ isUserAdmin(u) ? 'Demote' : 'Assign Admin' }}
                  </button>

                  <!-- EDIT USER BUTTON -->
                  <button
                    class="btn-action-edit"
                    (click)="openEditModal(u)"
                    title="Edit User Profile"
                  >
                    ✏️ Edit
                  </button>

                  <!-- DELETE USER BUTTON -->
                  <button
                    class="btn-action-delete"
                    (click)="deleteUser(u)"
                    title="Delete User Account"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>

            <tr *ngIf="filteredUsers.length === 0">
              <td colspan="9" class="empty-cell">
                No users found matching "{{ searchFilter }}".
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- EDIT USER MODAL -->
      <div class="modal-backdrop" *ngIf="editingUser" (click)="closeEditModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-row">
              <span class="modal-icon">✏️</span>
              <h3>Edit User Credentials</h3>
            </div>
            <button class="btn-modal-close" (click)="closeEditModal()">✕</button>
          </div>

          <form (ngSubmit)="saveUserEdit()" class="modal-form">
            <div class="form-group">
              <label>User UID (Read-only)</label>
              <input type="text" [value]="editingUser.uid" disabled class="form-control-disabled" />
            </div>

            <div class="form-group">
              <label>Display Name</label>
              <input
                type="text"
                [(ngModel)]="editForm.displayName"
                name="displayName"
                required
                class="form-control-modal"
                placeholder="User display name"
              />
            </div>

            <div class="form-group">
              <label>Email Address</label>
              <input
                type="email"
                [(ngModel)]="editForm.email"
                name="email"
                required
                class="form-control-modal"
                placeholder="user@example.com"
              />
            </div>

            <div class="form-group">
              <label>Account Role</label>
              <select [(ngModel)]="editForm.role" name="role" class="form-control-modal">
                <option value="user">👤 User (Standard Member)</option>
                <option value="admin">🛡️ Admin (Control Portal Access)</option>
              </select>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-cancel" (click)="closeEditModal()">
                Cancel
              </button>
              <button type="submit" class="btn-save" [disabled]="saving">
                {{ saving ? 'Saving Changes...' : 'Save User Details' }}
              </button>
            </div>
          </form>
        </div>
      <!-- USER TELEMETRY MODAL -->
      <div class="modal-backdrop" *ngIf="telemetryUser" (click)="closeTelemetryModal()">
        <div class="modal-card dossier-user-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-row">
              <span class="modal-icon">🛰️</span>
              <h3>User Login & Telemetry Dossier</h3>
            </div>
            <button class="btn-modal-close" (click)="closeTelemetryModal()">✕</button>
          </div>

          <div class="user-dossier-body">
            <div class="dossier-user-summary">
              <div class="user-avatar" [class.admin-avatar]="isUserAdmin(telemetryUser)">
                {{ (telemetryUser.displayName || telemetryUser.email || 'U').charAt(0).toUpperCase() }}
              </div>
              <div class="summary-details">
                <h4>{{ telemetryUser.displayName || 'No Name' }}</h4>
                <span class="summary-email">{{ telemetryUser.email }}</span>
                <span class="summary-role">{{ isUserAdmin(telemetryUser) ? '🛡️ Administrator' : '👤 Standard User' }}</span>
              </div>
            </div>

            <div class="dossier-grid-mini">
              <!-- Network & IP -->
              <div class="dossier-block">
                <span class="block-title">🌐 Network & IP</span>
                <div class="dossier-item">
                  <span class="d-label">Last Known IP</span>
                  <span class="d-val font-mono">{{ telemetryUser.lastIp || 'N/A' }}</span>
                </div>
                <div class="dossier-item" *ngIf="telemetryUser.lastIsp">
                  <span class="d-label">ISP Provider</span>
                  <span class="d-val text-cyan">⚡ {{ telemetryUser.lastIsp }}</span>
                </div>
                <div class="dossier-item" *ngIf="telemetryUser.lastAsn">
                  <span class="d-label">ASN</span>
                  <span class="d-val font-mono">{{ telemetryUser.lastAsn }}</span>
                </div>
              </div>

              <!-- Location -->
              <div class="dossier-block">
                <span class="block-title">📍 Location</span>
                <div class="dossier-item">
                  <span class="d-label">Country</span>
                  <span class="d-val">{{ telemetryUser.lastFlag || '📍' }} {{ telemetryUser.lastCountry || 'Unknown' }}</span>
                </div>
                <div class="dossier-item" *ngIf="telemetryUser.lastCity || telemetryUser.lastRegion">
                  <span class="d-label">City / Region</span>
                  <span class="d-val">{{ telemetryUser.lastCity }}{{ telemetryUser.lastRegion ? ', ' + telemetryUser.lastRegion : '' }}</span>
                </div>
                <div class="dossier-item" *ngIf="telemetryUser.lastPostal">
                  <span class="d-label">Postal / Zip</span>
                  <span class="d-val">📮 {{ telemetryUser.lastPostal }}</span>
                </div>
                <div class="dossier-item" *ngIf="telemetryUser.lastLat && telemetryUser.lastLon">
                  <span class="d-label">Map Coordinates</span>
                  <span class="d-val">
                    <a [href]="'https://www.google.com/maps?q=' + telemetryUser.lastLat + ',' + telemetryUser.lastLon" target="_blank" class="map-link-btn">
                      📍 View on Maps ↗
                    </a>
                  </span>
                </div>
              </div>

              <!-- Device & Environment -->
              <div class="dossier-block">
                <span class="block-title">💻 Device & System</span>
                <div class="dossier-item">
                  <span class="d-label">Device Type</span>
                  <span class="d-val">{{ telemetryUser.lastDevice || 'Desktop' }}</span>
                </div>
                <div class="dossier-item" *ngIf="telemetryUser.lastOs">
                  <span class="d-label">Operating System</span>
                  <span class="d-val">{{ telemetryUser.lastOs }}</span>
                </div>
                <div class="dossier-item" *ngIf="telemetryUser.lastBrowser">
                  <span class="d-label">Browser</span>
                  <span class="d-val">{{ telemetryUser.lastBrowser }}</span>
                </div>
                <div class="dossier-item" *ngIf="telemetryUser.lastScreen">
                  <span class="d-label">Screen Resolution</span>
                  <span class="d-val">{{ telemetryUser.lastScreen }}</span>
                </div>
              </div>

              <!-- Activity Dates -->
              <div class="dossier-block">
                <span class="block-title">⏱️ Activity History</span>
                <div class="dossier-item">
                  <span class="d-label">Joined</span>
                  <span class="d-val">{{ telemetryUser.createdAt | date:'medium' }}</span>
                </div>
                <div class="dossier-item">
                  <span class="d-label">Last Active</span>
                  <span class="d-val">{{ telemetryUser.lastLoginAt ? (telemetryUser.lastLoginAt | date:'medium') : 'N/A' }}</span>
                </div>
                <div class="dossier-item" *ngIf="telemetryUser.lastTimezone">
                  <span class="d-label">Timezone</span>
                  <span class="d-val">🕒 {{ telemetryUser.lastTimezone }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" (click)="closeTelemetryModal()">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { display: flex; flex-direction: column; gap: 1.5rem; }

    .page-header h1 { font-size: 1.75rem; color: #ffffff; margin: 0; }
    .page-header p { color: #94a3b8; margin: 0.25rem 0 0; font-size: 0.9rem; }
    
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .search-wrap {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1;
      max-width: 360px;
    }
    .search-icon {
      position: absolute;
      left: 0.75rem;
      font-size: 0.9rem;
      opacity: 0.6;
      pointer-events: none;
    }
    .form-control {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 0.65rem 0.85rem 0.65rem 2.4rem;
      color: white;
      outline: none;
      width: 100%;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .form-control:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
    }
    .stats-summary {
      color: #94a3b8;
      font-size: 0.88rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .stats-summary strong { color: white; }
    .text-admin { color: #818cf8 !important; }
    .sep { color: rgba(255,255,255,0.2); }

    .table-card {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      overflow-x: auto;
      backdrop-filter: blur(12px);
    }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; }
    .data-table th {
      padding: 1rem 1.2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .data-table td {
      padding: 0.95rem 1.2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: #e2e8f0;
      vertical-align: middle;
    }
    .data-table tbody tr:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .user-cell { display: flex; align-items: center; gap: 0.85rem; }
    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #64748b, #475569);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
      flex-shrink: 0;
    }
    .user-avatar.admin-avatar {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
    }
    .user-name-col {
      display: flex;
      flex-direction: column;
    }
    .email-text {
      color: #cbd5e1;
      font-size: 0.88rem;
      font-family: monospace;
    }

    /* Role chips */
    .role-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.28rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.76rem;
      font-weight: 700;
    }
    .chip-admin {
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.35);
      color: #a5b4fc;
    }
    .chip-user {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
    }

    /* Action buttons */
    .action-btn-group {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: flex-end;
    }
    .btn-action-role {
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.35);
      color: #a5b4fc;
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.78rem;
      font-weight: 600;
      transition: all 0.2s;
    }
    .btn-action-role:hover { background: #6366f1; color: white; }
    .btn-action-role.demote {
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }
    .btn-action-role.demote:hover { background: #ef4444; color: white; }

    .btn-action-edit {
      background: rgba(59, 130, 246, 0.12);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #93c5fd;
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.78rem;
      font-weight: 600;
      transition: all 0.2s;
    }
    .btn-action-edit:hover { background: #3b82f6; color: white; }

    .btn-action-delete {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #f87171;
      padding: 0.35rem 0.65rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .btn-action-delete:hover { background: #ef4444; color: white; }

    .btn-action-telemetry {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      padding: 0.35rem 0.55rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.82rem;
      transition: all 0.2s;
    }
    .btn-action-telemetry:hover { background: #10b981; color: white; }

    .user-ip-cell { display: flex; flex-direction: column; gap: 2px; }
    .user-ip-text { font-family: monospace; font-size: 0.82rem; color: #ffffff; font-weight: 600; }
    .user-isp-text { font-size: 0.74rem; color: #38bdf8; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .user-loc-cell { display: flex; align-items: center; gap: 0.35rem; font-size: 0.82rem; color: #cbd5e1; }
    .user-dev-cell { display: flex; flex-direction: column; gap: 2px; font-size: 0.82rem; color: #e2e8f0; }
    .dev-sub { font-size: 0.73rem; color: #94a3b8; }
    .text-muted { color: #64748b; }
    .text-cyan { color: #38bdf8 !important; }
    .font-mono { font-family: monospace; }

    .dossier-user-card { max-width: 640px !important; }
    .user-dossier-body { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
    .dossier-user-summary { display: flex; align-items: center; gap: 1rem; background: rgba(255, 255, 255, 0.03); padding: 1rem; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.06); }
    .summary-details h4 { margin: 0 0 0.2rem; font-size: 1.05rem; color: white; }
    .summary-email { font-size: 0.82rem; color: #94a3b8; font-family: monospace; display: block; margin-bottom: 0.25rem; }
    .summary-role { font-size: 0.75rem; color: #a5b4fc; font-weight: 600; }

    .dossier-grid-mini { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    @media (max-width: 600px) { .dossier-grid-mini { grid-template-columns: 1fr; } }
    .dossier-block { background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .block-title { font-size: 0.76rem; text-transform: uppercase; color: #818cf8; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 0.2rem; }
    .dossier-item { display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; }
    .d-label { color: #94a3b8; }
    .d-val { color: #e2e8f0; font-weight: 500; text-align: right; }
    .map-link-btn { color: #818cf8; text-decoration: none; font-size: 0.75rem; background: rgba(99, 102, 241, 0.15); padding: 2px 6px; border-radius: 4px; }
    .map-link-btn:hover { text-decoration: underline; background: #6366f1; color: white; }

    .empty-cell {
      text-align: center;
      padding: 2.5rem;
      color: #94a3b8;
    }

    .alert-success {
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: #4ade80;
      padding: 0.75rem 1rem;
      border-radius: 10px;
    }
    .alert-error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      padding: 0.75rem 1rem;
      border-radius: 10px;
    }

    /* Modal Backdrop & Card */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .modal-card {
      background: #131a26;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 18px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(99, 102, 241, 0.2);
      overflow: hidden;
      animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideUp {
      from { transform: translateY(20px) scale(0.97); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .modal-title-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .modal-header h3 {
      margin: 0;
      color: #ffffff;
      font-size: 1.15rem;
      font-weight: 700;
    }
    .modal-icon { font-size: 1.25rem; }
    .btn-modal-close {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 1.2rem;
      cursor: pointer;
      padding: 0.25rem;
      transition: color 0.2s;
    }
    .btn-modal-close:hover { color: #ffffff; }

    .modal-form {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .form-group label {
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .form-control-modal {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 0.7rem 0.9rem;
      color: white;
      font-size: 0.9rem;
      outline: none;
      transition: all 0.2s;
    }
    .form-control-modal:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
    }
    .form-control-disabled {
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      padding: 0.7rem 0.9rem;
      color: #64748b;
      font-size: 0.85rem;
      font-family: monospace;
      outline: none;
      cursor: not-allowed;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.75rem;
    }
    .btn-cancel {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-cancel:hover { background: rgba(255, 255, 255, 0.15); color: #fff; }
    .btn-save {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      border: none;
      color: white;
      padding: 0.65rem 1.4rem;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
    }
    .btn-save:hover { opacity: 0.95; transform: translateY(-1px); }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  `]
})
export class AdminUsersComponent implements OnInit {
  private readonly auth = inject(AuthService);

  readonly currentUser$ = this.auth.currentUser$;

  users: AppUser[] = [];
  searchFilter = '';
  successMsg = '';
  errorMsg = '';

  telemetryUser: AppUser | null = null;
  editingUser: AppUser | null = null;
  editForm: { displayName: string; email: string; role: 'admin' | 'user' } = {
    displayName: '',
    email: '',
    role: 'user'
  };
  saving = false;

  openTelemetryModal(user: AppUser): void {
    this.telemetryUser = user;
  }

  closeTelemetryModal(): void {
    this.telemetryUser = null;
  }

  get adminCount(): number {
    return this.users.filter(u => this.isUserAdmin(u)).length;
  }

  get filteredUsers(): AppUser[] {
    if (!this.searchFilter.trim()) return this.users;
    const q = this.searchFilter.toLowerCase();
    return this.users.filter(
      u => (u.displayName && u.displayName.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q))
    );
  }

  ngOnInit(): void {
    this.auth.getAllUsers().subscribe(list => (this.users = list));
  }

  isUserAdmin(user: AppUser): boolean {
    const emailLower = user.email?.toLowerCase() || '';
    return user.role === 'admin' || !!environment.adminEmails?.map(e => e.toLowerCase()).includes(emailLower);
  }

  async toggleRole(user: AppUser): Promise<void> {
    const nextRole: 'admin' | 'user' = this.isUserAdmin(user) ? 'user' : 'admin';
    try {
      await this.auth.updateUserRole(user.uid, nextRole);
      user.role = nextRole;
      this.successMsg = `Updated ${user.email} role to ${nextRole === 'admin' ? 'Administrator' : 'Standard User'}.`;
      setTimeout(() => (this.successMsg = ''), 3500);
    } catch (err: any) {
      this.errorMsg = err?.message || 'Failed to update user role.';
      setTimeout(() => (this.errorMsg = ''), 3500);
    }
  }

  openEditModal(user: AppUser): void {
    this.editingUser = user;
    this.editForm = {
      displayName: user.displayName || '',
      email: user.email || '',
      role: user.role === 'admin' || this.isUserAdmin(user) ? 'admin' : 'user'
    };
  }

  closeEditModal(): void {
    this.editingUser = null;
    this.saving = false;
  }

  async saveUserEdit(): Promise<void> {
    if (!this.editingUser) return;
    this.saving = true;

    try {
      const updates: Partial<AppUser> = {
        displayName: this.editForm.displayName.trim() || 'User',
        email: this.editForm.email.trim(),
        role: this.editForm.role
      };

      await this.auth.updateUserData(this.editingUser.uid, updates);

      // Update in local state
      this.editingUser.displayName = updates.displayName!;
      this.editingUser.email = updates.email!;
      this.editingUser.role = updates.role!;

      this.successMsg = `User ${updates.email} details saved successfully.`;
      setTimeout(() => (this.successMsg = ''), 3500);
      this.closeEditModal();
    } catch (err: any) {
      this.errorMsg = err?.message || 'Failed to update user.';
      setTimeout(() => (this.errorMsg = ''), 3500);
    } finally {
      this.saving = false;
    }
  }

  async deleteUser(user: AppUser): Promise<void> {
    const current = this.auth.currentUser;
    if (current && current.uid === user.uid) {
      this.errorMsg = 'You cannot delete your own logged-in account.';
      setTimeout(() => (this.errorMsg = ''), 3000);
      return;
    }

    const confirmMsg = `Are you sure you want to permanently delete user "${user.displayName || user.email}"?`;
    if (!confirm(confirmMsg)) return;

    try {
      await this.auth.deleteUser(user.uid);
      this.users = this.users.filter(u => u.uid !== user.uid);
      this.successMsg = `User ${user.email || user.displayName} deleted successfully.`;
      setTimeout(() => (this.successMsg = ''), 3500);
    } catch (err: any) {
      this.errorMsg = err?.message || 'Failed to delete user.';
      setTimeout(() => (this.errorMsg = ''), 3500);
    }
  }
}
