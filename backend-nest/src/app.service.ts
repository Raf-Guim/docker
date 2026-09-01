import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class AppService {
  getHello() {
    return { message: 'Hello from NestJS' };
  }

  async getUsers() {
    return prisma.user.findMany();
  }
}
