import { Module } from '@nestjs/common';
import { DiagnosticsController } from './diagnostics.controller.js';

/** Liveness and readiness endpoints; uses the global database provider. */
@Module({ controllers: [DiagnosticsController] })
export class DiagnosticsModule {}
