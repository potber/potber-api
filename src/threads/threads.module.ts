import { Module } from '@nestjs/common';
import { HttpModule } from 'src/http/http.module';
import { PostsModule } from 'src/posts/posts.module';
import { XmlApiModule } from 'src/xml-api/xml-api.module';
import { ThreadsController } from './controllers/threads.controller';
import { ThreadsService } from './services/threads.service';
import { THREADS_SERVICE } from './threads.tokens';
import { EncodingModule } from 'src/encoding/encoding.module';

@Module({
  imports: [HttpModule, XmlApiModule, EncodingModule, PostsModule],
  exports: [ThreadsService, THREADS_SERVICE],
  providers: [
    ThreadsService,
    {
      provide: THREADS_SERVICE,
      useExisting: ThreadsService,
    },
  ],
  controllers: [ThreadsController],
})
export class ThreadsModule {}
