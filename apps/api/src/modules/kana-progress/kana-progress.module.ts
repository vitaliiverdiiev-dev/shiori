import { Module } from '@nestjs/common';
import { KanaProgressController } from './http/controllers/kana-progress.controller.js';

@Module({ controllers: [KanaProgressController] })
export class KanaProgressModule {}
