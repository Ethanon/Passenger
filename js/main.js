import { AppConfig } from './config.js';
import { GoogleAuthService } from './auth/GoogleAuthService.js';
import { DatabaseService } from './storage/DatabaseService.js';
import { GoogleDriveService } from './storage/GoogleDriveService.js';
import { PassengerService } from './services/PassengerService.js';
import { DataStoreService } from './services/DataStoreService.js';
import { PreferencesService } from './services/PreferencesService.js';
import { DateSelector } from './ui/DateSelector.js';
import { TripSelector } from './ui/TripSelector.js';
import { PassengerList } from './ui/PassengerList.js';
import { PassengerManager } from './ui/PassengerManager.js';
import { SettingsManager } from './ui/SettingsManager.js';
import { ThemeManager } from './ui/ThemeManager.js';

class Application {
    constructor() {
        this.authService = new GoogleAuthService();
        this.databaseService = null;
        this.driveService = null;
        this.preferencesService = null;
        this.passengerService = null;
        this.dataStoreService = null;
        this.dateSelector = null;
        this.tripSelector = null;
        this.passengerList = null;
        this.passengerManager = null;
        this.settingsManager = null;
        this.isAuthenticated = false;
        this.syncIndicator = document.getElementById('sync-indicator');
    }

    async Initialize() {
        if (AppConfig.useLocalStorage) {
            this.ShowLocalModeIndicator();
            await this.InitializeApplication(true);
        } else {
            this.authService.Initialize(AppConfig.googleClientId, (isAuthenticated) => {
                this.isAuthenticated = isAuthenticated;
                if (isAuthenticated) {
                    this.InitializeApplication(false);
                } else {
                    this.OnSignedOut();
                }
            });
        }
    }
    
    async InitializeApplication(isLocal) {

        this.ShowSyncStatus('Loading...');

        this.driveService = new GoogleDriveService(this.authService);

        this.preferencesService = new PreferencesService(this.driveService);
        await this.preferencesService.LoadPreferences();

        this.themeManager = new ThemeManager(this.preferencesService);
        this.themeManager.Initialize();

        this.databaseService = new DatabaseService(this.driveService, this.preferencesService);
        await this.databaseService.Initialize();

        this.passengerService = new PassengerService(this.databaseService);
        this.dataStoreService = new DataStoreService(this.databaseService, this.driveService, this.preferencesService);

        this.InitializeUI(isLocal);
        this.ShowMainContainer();
        this.LoadPassengers();

        if (isLocal) {
            this.ShowSyncStatus('Offline');
        }
        else {
            this.dataStoreService.StartBackgroundSync();
            this.StartSyncStatusMonitoring();
            this.ShowSyncStatus('Synced');
        }
    }

    ShowLocalModeIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'local-mode-banner';
        indicator.textContent = 'LOCAL TESTING MODE - Data stored in browser';
        document.body.insertBefore(indicator, document.body.firstChild);
    }

    InitializeUI(isLocal) {
        this.dateSelector = new DateSelector((date) => this.OnDateChanged(date));
        this.tripSelector = new TripSelector((trip) => this.OnTripChanged(trip));
        this.passengerList = new PassengerList(this.dataStoreService);
        this.passengerManager = new PassengerManager(
            this.passengerService,
            this.dataStoreService,
            () => this.LoadPassengers()
        );
        
        this.settingsManager = new SettingsManager(
            this.preferencesService,
            this.driveService,
            this.dataStoreService,
            () => this.ReloadApplication(),
            AppConfig.useLocalStorage,
            this.databaseService,
            this.authService
        );

        if (isLocal) {
            // Disable logout button in local mode
            const logoutButton = document.getElementById('logout-button');
            logoutButton.disabled = true;
            logoutButton.style.opacity = '0.5';
            logoutButton.style.cursor = 'not-allowed';
            logoutButton.title = 'Sign out not available in local mode';
        }
    }

    ReloadApplication() {
        window.location.reload();
    }

    LoadPassengers() {
        const passengers = this.passengerService.GetActivePassengers();
        const date = this.dateSelector.GetSelectedDate();
        const trip = this.tripSelector.GetCurrentTrip();
        this.passengerList.Render(passengers, date, trip);
    }

    OnDateChanged(date) {
        const trip = this.tripSelector.GetCurrentTrip();
        this.passengerList.UpdateNotes(date, trip);
    }

    OnTripChanged(trip) {
        const date = this.dateSelector.GetSelectedDate();
        this.passengerList.UpdateNotes(date, trip);
    }

    ShowMainContainer() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('main-container').classList.remove('hidden');
    }

    OnSignedOut() {
        document.getElementById('main-container').classList.add('hidden');
        document.getElementById('auth-container').classList.remove('hidden');
        
        if (this.dataStoreService) {
            this.dataStoreService.StopBackgroundSync();
        }
    }

    StartSyncStatusMonitoring() {
        setInterval(() => {
            if (this.dataStoreService && this.dataStoreService.HasPendingChanges()) {
                this.ShowSyncStatus('Syncing...');
            } else {
                this.ShowSyncStatus('Synced');
            }
        }, 1000);
    }

    ShowSyncStatus(status) {
        this.syncIndicator.textContent = status;
        this.syncIndicator.className = 'sync-indicator';
        
        if (status === 'Synced') {
            this.syncIndicator.classList.add('synced');
        } else if (status === 'Syncing...') {
            this.syncIndicator.classList.add('syncing');
        }
    }

    ShowLoadingOverlay(message) {
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-message">${message}</div>
                </div>
            `;
            document.body.appendChild(overlay);
        } else {
            overlay.querySelector('.loading-message').textContent = message;
            overlay.classList.remove('hidden');
        }
    }

    HideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    ShowLoadingError(message) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-error">${message}</div>
                    <button onclick="location.reload()" class="retry-button">Retry</button>
                </div>
            `;
        }
    }
}

const app = new Application();
app.Initialize();