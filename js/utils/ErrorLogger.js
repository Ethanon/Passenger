export class ErrorLogger {
    static errors = [];

    static Log(source, message, details = null) {
        this.errors.push({
            timestamp: new Date().toISOString(),
            source,
            message,
            details
        });
    }

    static GetErrors() {
        return this.errors;
    }

    static HasErrors() {
        return this.errors.length > 0;
    }

    static Clear() {
        this.errors = [];
    }
}
