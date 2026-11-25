// Un error "conocido": sabemos qué pasó y qué código HTTP devolver.
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static notFound(message = 'Recurso no encontrado') {
    return new AppError(404, message);
  }

  static badRequest(message = 'Solicitud inválida') {
    return new AppError(400, message);
  }
}
