export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

export function toAppError(error, fallbackStatus = 400, fallbackMessage = "Request failed.") {
  if (error instanceof AppError) return error;
  const status = Number(error?.status);
  if (Number.isFinite(status) && status >= 400) {
    return new AppError(status, error?.message || fallbackMessage);
  }
  return new AppError(fallbackStatus, error?.message || fallbackMessage);
}
