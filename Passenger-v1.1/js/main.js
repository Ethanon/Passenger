import { AppConfig } from './config.js';
import { GoogleAuthService } from './auth/GoogleAuthService.js';
import { DatabaseService } from './storage/DatabaseService.js';
import { GoogleDriveService } from './storage/GoogleDriveService.js';
import { LocalStorageService } from './storage/LocalStorageService.js';
import { PassengerService } from './services/PassengerService.js';
import { NoteService } from './services/NoteService.js';
import { PreferencesService } from './services/PreferencesService.js';
import { LocalPreferencesService } from './services/LocalPreferencesService.js';
import { DateSelector } from './ui/DateSelector.js';
import { TripSelector } from './ui/TripSelector.js';
import { PassengerList } from './ui/PassengerList.js';
import { PassengerManager } from './ui/PassengerManager.js';
import { SettingsManager } from './ui/SettingsManager.js';
import { ThemeManager } from './ui/ThemeManager.js';

class Application {
    constructor() {
        this.authService = new GoogleAuthService();
        this.databaseService = new DatabaseService();
        this.driveService = null;
        this.preferencesService = null;
        this.passengerService = null;
        this.noteService = null;
        this.dateSelector = null;
        this.tripSelector = null;
        this.passengerList = null;
        this.passengerManager = null;
        this.settingsManager = null;
        this.syncIndicator = document.getElementById('sync-indicator');
    }

    async Initialize() {
        if (AppConfig.useLocalStorage) {
            this.ShowLocalModeIndicator();
            await this.InitializeLocalMode();
        } else {
            this.authService.Initialize(AppConfig.googleClientId, (isAuthenticated) => {
                if (isAuthenticated) {
                    this.OnAuthenticated();
                } else {
                    this.OnSignedOut();
                }
            });
        }
    }

    async InitializeLocalMode() {
        this.ShowSyncStatus('Loading...');
        
        this.preferencesService = new LocalPreferencesService();
        await this.preferencesService.LoadPreferences();
        
        // Initialize and apply theme
        this.themeManager = new ThemeManager(this.preferencesService);
        this.themeManager.Initialize();
        
        const databaseKey = this.preferencesService.GetDatabaseFileId();
        this.driveService = new LocalStorageService(databaseKey);
        this.driveService.SetPreferencesService(this.preferencesService);
        
        const databaseBuffer = await this.driveService.DownloadDatabase();
        await this.databaseService.Initialize(databaseBuffer);

        this.passengerService = new PassengerService(this.databaseService);
        this.noteService = new NoteService(this.databaseService, this.driveService);

        this.InitializeUI();
        this.ShowMainContainer();
        this.LoadPassengers();
        
        // Disable logout button in local mode
        const logoutButton = document.getElementById('logout-button');
        logoutButton.disabled = true;
        logoutButton.style.opacity = '0.5';
        logoutButton.style.cursor = 'not-allowed';
        logoutButton.title = 'Sign out not available in local mode';
        
        this.noteService.StartBackgroundSync();
        this.StartSyncStatusMonitoring();
        
        this.ShowSyncStatus('Synced');
    }

    ShowLocalModeIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'local-mode-banner';
        indicator.textContent = 'LOCAL TESTING MODE - Data stored in browser';
        document.body.insertBefore(indicator, document.body.firstChild);
    }

    async OnAuthenticated() {
        this.ShowSyncStatus('Loading...');
        
        this.driveService = new GoogleDriveService(this.authService);
        this.preferencesService = new PreferencesService(this.driveService);
        
        await this.preferencesService.LoadPreferences();
        
        // Initialize and apply theme
        this.themeManager = new ThemeManager(this.preferencesService);
        this.themeManager.Initialize();
        
        const databaseFileId = this.preferencesService.GetDatabaseFileId();
        const databaseBuffer = databaseFileId
            ? await this.driveService.DownloadDatabaseById(databaseFileId)
            : await this.driveService.DownloadDatabase();
            
        await this.databaseService.Initialize(databaseBuffer);

        this.passengerService = new PassengerService(this.databaseService);
        this.noteService = new NoteService(this.databaseService, this.driveService);

        this.InitializeUI();
        this.ShowMainContainer();
        this.LoadPassengers();
        
        // Wire up logout button
        document.getElementById('logout-button').addEventListener('click', () => {
            this.authService.SignOut();
        });
        
        this.noteService.StartBackgroundSync();
        this.StartSyncStatusMonitoring();
        
        this.ShowSyncStatus('Synced');
    }

    InitializeUI() {
        this.dateSelector = new DateSelector((date) => this.OnDateChanged(date));
        this.tripSelector = new TripSelector((trip) => this.OnTripChanged(trip));
        this.passengerList = new PassengerList(this.noteService);
        this.passengerManager = new PassengerManager(
            this.passengerService,
            () => this.LoadPassengers()
        );
        
        this.settingsManager = new SettingsManager(
            this.preferencesService,
            this.driveService,
            () => this.ReloadApplication(),
            AppConfig.useLocalStorage,
            this.databaseService
        );
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
        
        if (this.noteService) {
            this.noteService.StopBackgroundSync();
        }
    }

    StartSyncStatusMonitoring() {
        setInterval(() => {
            if (this.noteService && this.noteService.HasPendingChanges()) {
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
}

const app = new Application();
app.Initialize();
