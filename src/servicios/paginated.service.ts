import { firstValueFrom, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { PrismaService } from './prisma.service';
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    take: number;
    skip: number;
    count: number;
  };
}
export abstract class PaginatedService<T> {
  constructor(protected prisma: PrismaService) {}

  protected abstract getModelName(): string;

  public async getPaginatedData(
    dto: PaginationDto,
    where: object = {},
    include: object = {},
  ): Promise<PaginatedResult<T>> {
    const modelName = this.getModelName();

    const count = await this.prisma[modelName].count({
      where,
    });
    const result = await firstValueFrom(
      from(
        this.prisma[modelName].findMany({
          where,
          take: dto.take,
          skip: dto.skip,
          include,
          orderBy: {
            createdAt: 'desc',
          },
        }),
      ).pipe(
        map(
          (data) =>
            ({
              data,
              pagination: {
                ...dto,
                count,
              },
            }) as PaginatedResult<T>,
        ),
      ),
    );
    return result;
  }
}
