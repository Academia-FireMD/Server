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

    // Obtener el número total de elementos después del filtrado
    const count = await this.prisma[modelName].count({
      where,
    });

    // Ajustar el `skip` dinámicamente
    const results = await this.prisma[modelName].findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' }, // Ordenar antes de paginar
      skip: count > dto.skip ? dto.skip : 0, // Si hay menos datos filtrados que `skip`, empezamos desde 0
      take: dto.take,
    });

    return {
      data: results,
      pagination: {
        ...dto,
        count, // Número total de elementos después del filtrado
      },
    };
  }
}
