export class GoogleAuthService {
    constructor() {
        this.clientId = '';
        this.accessToken = null;
        this.tokenExpiresAt = null;
        this.onAuthStateChanged = null;
    }

    Initialize(clientId, onAuthStateChanged) {
        this.clientId = clientId;
        this.onAuthStateChanged = onAuthStateChanged;
        
        google.accounts.id.initialize({
            client_id: this.clientId,
            callback: (response) => this.HandleCredentialResponse(response),
            auto_select: false
        });

        google.accounts.id.renderButton(
            document.getElementById('google-signin'),
            { theme: 'outline', size: 'large', width: 250 }
        );
    }

    HandleCredentialResponse(response) {
        this.accessToken = response.credential;
        this.tokenExpiresAt = Date.now() + (3600 * 1000);
        
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
    }

    GetAuthState() {
        return {
            isAuthenticated: this.IsAuthenticated(),
            accessToken: this.accessToken || '',
            expiresAt: this.tokenExpiresAt
        };
    }
}
