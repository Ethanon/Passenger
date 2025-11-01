export class GoogleAuthService {
    constructor() {
        this.clientId = '';
        this.accessToken = null;
        this.tokenExpiresAt = null;
        this.onAuthStateChanged = null;
        this.buttonContainer = null;
    }

    Initialize(clientId, onAuthStateChanged) {
        this.clientId = clientId;
        this.onAuthStateChanged = onAuthStateChanged;
        this.buttonContainer = document.getElementById('google-signin');
        
        google.accounts.id.initialize({
            client_id: this.clientId,
            callback: (response) => this.HandleCredentialResponse(response),
            auto_select: false
        });

        this.RenderButton();
    }

    RenderButton() {
        if (!this.buttonContainer) {
            return;
        }

        // Clear any existing button content
        this.buttonContainer.innerHTML = '';

        // Render the Google Sign-In button
        google.accounts.id.renderButton(
            this.buttonContainer,
            { theme: 'outline', size: 'large', width: 250 }
        );
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
