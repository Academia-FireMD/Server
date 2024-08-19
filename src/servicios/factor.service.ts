import { Injectable } from '@nestjs/common';
import { UpdateFactorDto } from 'src/dtos/factor.dto';
import { PrismaService } from './prisma.service';

@Injectable()
export class FactorService {
  constructor(public prisma: PrismaService) {}

  public getAllFactors() {
    return this.prisma.factor.findMany({});
  }

  public async updateFactor(dto: UpdateFactorDto) {
    const foundFactor = await this.prisma.factor.findFirst({
      where: {
        id: dto.name,
      },
    });
    if (!!foundFactor) {
      return this.prisma.factor.update({
        where: {
          id: dto.name,
        },
        data: {
          value: dto.value,
        },
      });
    } else {
      return this.prisma.factor.create({
        data: {
          value: dto.value,
          id: dto.name,
        },
      });
    }
  }
}
