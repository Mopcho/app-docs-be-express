export class ValidationError extends Error {
    constructor(msg?: string) {
        super()
        this.message = `[Validation Error]${msg ? ` ${msg}` : ''}`
    }
}
export class ExecutionError extends Error {
    constructor(msg?: string) {
        super()
        this.message = `[Execution Error]${msg ? ` ${msg}` : ''}`
    }
}
export class NotFoundError extends Error {
    constructor(msg?: string) {
        super()
        this.message = `[Not Found Error]${msg ? ` ${msg}` : ''}`
    }
}

export class GenericError extends Error {
    constructor(msg?: string) {
        super()
        this.message = `[Generic Error]${msg ? ` ${msg}` : ''}`
    }
}