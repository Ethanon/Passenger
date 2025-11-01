export class GoogleAuthService {
    constructor() {
        this.clientId = '';
        this.accessToken = null;
        this.tokenExpiresAt = null;
        this.onAuthStateChanged = null;
        this.buttonContainer = null;
        this.tokenClient = null;
        this.renderAttempts = 0;
        this.maxRenderAttempts = 5;
        this.scopes = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email';
    }

    Initialize(clientId, onAuthStateChanged) {
        this.clientId = clientId;
        this.onAuthStateChanged = onAuthStateChanged;
        this.buttonContainer = document.getElementById('google-signin');
        
        this.ShowLoadingState();
        this.WaitForGoogleScript();
    }

    WaitForGoogleScript() {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
            this.InitializeOAuth();
        } else if (this.renderAttempts < this.maxRenderAttempts) {
            this.renderAttempts++;
            setTimeout(() => this.WaitForGoogleScript(), 500);
        } else {
            this.ShowErrorState();
        }
    }

    InitializeOAuth() {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.clientId,
            scope: this.scopes,
            callback: (response) => this.HandleTokenResponse(response)
        });
        
        this.RenderButton();
    }

    ShowLoadingState() {
        if (!this.buttonContainer) return;
        this.buttonContainer.innerHTML = '<div class="auth-loading">Initializing sign-in...</div>';
    }

    ShowErrorState() {
        if (!this.buttonContainer) return;
        this.buttonContainer.innerHTML = `
            <div class="auth-error">
                <p>Unable to load Google Sign-In</p>
                <button onclick="location.reload()" class="retry-button">Retry</button>
            </div>
        `;
    }

    RenderButton() {
        if (!this.buttonContainer) return;
        
        this.buttonContainer.innerHTML = '';
        
        const button = document.createElement('button');
        button.className = 'google-signin-button';
        button.textContent = 'Sign in with Google';
        button.onclick = () => this.RequestToken();
        
        this.buttonContainer.appendChild(button);
    }

    RequestToken() {
        if (!this.tokenClient) {
            console.error('GoogleAuth: Token client not initialized');
            return;
        }
        
        this.tokenClient.requestAccessToken({ prompt: '' });
    }

    HandleTokenResponse(response) {
        if (response.error) {
            console.error('GoogleAuth: Token error', response.error);
            return;
        }

        this.accessToken = response.access_token;
        this.tokenExpiresAt = Date.now() + (response.expires_in * 1000);
        
        if (this.onAuthStateChanged) {
            this.onAuthStateChanged(true);
        }
    }

    async GetAccessToken() {
        if (!this.IsAuthenticated()) {
            return '';
        }

        if (this.IsTokenExpired()) {
            await this.RefreshToken();
        }

        return this.accessToken || '';
    }

    IsAuthenticated() {
        return this.accessToken !== null && !this.IsTokenExpired();
    }

    IsTokenExpired() {
        return this.tokenExpiresAt === null || Date.now() >= this.tokenExpiresAt;
    }

    async RefreshToken() {
        if (!this.tokenClient) return;
        
        return new Promise((resolve) => {
            this.tokenClient.requestAccessToken({ 
                prompt: '',
                callback: (response) => {
                    if (response.error) {
                        this.SignOut();
                    } else {
                        this.HandleTokenResponse(response);
                    }
                    resolve();
                }
            });
        });
    }

    SignOut() {
        if (this.accessToken) {
            google.accounts.oauth2.revoke(this.accessToken, () => {
                console.log('Token revoked');
            });
        }
        
        this.accessToken = null;
        this.tokenExpiresAt = null;
        
        if (this.onAuthStateChanged) {
            this.onAuthStateChanged(false);
        }

        setTimeout(() => this.RenderButton(), 100);
    }

    GetAuthState() {
        return {
            isAuthenticated: this.IsAuthenticated(),
            accessToken: this.accessToken || '',
            expiresAt: this.tokenExpiresAt
        };
    }
}
