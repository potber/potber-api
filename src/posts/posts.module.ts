import { Module } from '@nestjs/common';
import { EncodingModule } from 'src/encoding/encoding.module';
import { HttpModule } from 'src/http/http.module';
import { UsersModule } from 'src/users/users.module';
import { XmlApiModule } from 'src/xml-api/xml-api.module';
import { PostsController } from './controllers/posts.controller';
import { PostsService } from './services/posts.services';

@Module({
  imports: [EncodingModule, UsersModule, XmlApiModule, HttpModule],
  exports: [PostsService],
  providers: [PostsService],
  controllers: [PostsController],
})
export class PostsModule {}
