import { Module } from '@nestjs/common';
import { DiagnosticsController } from './http/controllers/diagnostics.controller.js';

@Module({ controllers: [DiagnosticsController] })
export class DiagnosticsModule {}
