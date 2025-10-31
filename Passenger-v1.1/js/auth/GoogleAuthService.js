export class GoogleAuthService {
    constructor() {
        this.clientId = '';
        this.accessToken = null;
        this.tokenExpiresAt = null;
        this.onAuthStateChanged = null;
        this.buttonContainer = null;
        this.renderAttempts = 0;
        this.maxRenderAttempts = 5;
    }

    Initialize(clientId, onAuthStateChanged) {
        this.clientId = clientId;
        this.onAuthStateChanged = onAuthStateChanged;
        this.buttonContainer = document.getElementById('google-signin');
        
        this.ShowLoadingState();
        this.WaitForGoogleScript();
    }

    WaitForGoogleScript() {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            google.accounts.id.initialize({
                client_id: this.clientId,
                callback: (response) => this.HandleCredentialResponse(response),
                auto_select: false
            });
            this.RenderButton();
        } else if (this.renderAttempts < this.maxRenderAttempts) {
            this.renderAttempts++;
            setTimeout(() => this.WaitForGoogleScript(), 500);
        } else {
            this.ShowErrorState();
        }
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

        try {
            google.accounts.id.renderButton(
                this.buttonContainer,
                { theme: 'outline', size: 'large', width: 250 }
            );
        } catch (error) {
            console.error('Failed to render Google Sign-In button:', error);
            if (this.renderAttempts < this.maxRenderAttempts) {
                this.renderAttempts++;
                setTimeout(() => this.RenderButton(), 500);
            } else {
                this.ShowErrorState();
            }
        }
    }

    HandleCredentialResponse(response) {
        try {
            if (!response || !response.credential) {
                console.error('Invalid credential response');
                this.RenderButton();
                return;
            }

            this.accessToken = response.credential;
            this.tokenExpiresAt = Date.now() + (3600 * 1000);
            
            if (this.onAuthStateChanged) {
                this.onAuthStateChanged(true);
            }
        } catch (error) {
            console.error('Error handling credential response:', error);
            this.RenderButton();
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
        return new Promise((resolve) => {
            google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    this.SignOut();
                }
                resolve();
            });
        });
    }

    SignOut() {
        this.accessToken = null;
        this.tokenExpiresAt = null;
        google.accounts.id.disableAutoSelect();
        
        if (this.onAuthStateChanged) {
            this.onAuthStateChanged(false);
        }

        // Re-render the button after sign out
        setTimeout(() => {
            this.RenderButton();
        }, 100);
    }

    GetAuthState() {
        return {
            isAuthenticated: this.IsAuthenticated(),
            accessToken: this.accessToken || '',
            expiresAt: this.tokenExpiresAt
        };
    }
}
