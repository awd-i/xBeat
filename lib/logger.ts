// Simple logging utility for development
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  context?: Record<string, unknown>
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString()
    let formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`
    
    if (context) {
      formatted += ` | ${JSON.stringify(context, null, 2)}`
    }
    
    return formatted
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      console.log(this.formatMessage('debug', message, context))
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message, context))
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(this.formatMessage('warn', message, context))
  }

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    const errorContext = {
      ...context,
      ...(error instanceof Error ? {
        error: error.message,
        stack: error.stack,
      } : { error: String(error) })
    }
    
    console.error(this.formatMessage('error', message, errorContext))
  }
}

export const logger = new Logger()

// Convenience functions for common use cases
export const logError = (message: string, error?: Error | unknown, context?: Record<string, unknown>) => {
  logger.error(message, error, context)
}

export const logInfo = (message: string, context?: Record<string, unknown>) => {
  logger.info(message, context)
}

export const logWarn = (message: string, context?: Record<string, unknown>) => {
  logger.warn(message, context)
}

export const logDebug = (message: string, context?: Record<string, unknown>) => {
  logger.debug(message, context)
}