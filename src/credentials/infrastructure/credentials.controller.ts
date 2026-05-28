import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../auth/infrastructure/guards/jwt-auth.guard";
import { CreateCredentialCommand } from "../application/commands/create-credential.command";
import {
  CreateCredentialDto,
  CreateCredentialRequestDto,
} from "../application/dto/create-credential.dto";
import { CredentialResponseDto } from "../application/dto/credential-response.dto";
import { GetCredentialQuery } from "../application/queries/get-credential.query";
import { ListCredentialsQuery } from "../application/queries/list-credentials.query";
import { CreateCredentialData } from "../domain/credential.repository";
import { LocalFileService } from "./storage/local-file.service";
import { multerOptions } from "./storage/multer-options";

@ApiTags("credentials")
@UseGuards(JwtAuthGuard)
@Controller("credentials")
export class CredentialsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly localFileService: LocalFileService,
  ) {}

  @Post()
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: CreateCredentialRequestDto })
  @ApiCreatedResponse({ type: CredentialResponseDto })
  @UseInterceptors(FileInterceptor("image", multerOptions))
  async create(
    @Body() dto: CreateCredentialDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<CredentialResponseDto> {
    if (!file) {
      throw new BadRequestException("Image is required");
    }

    const data: CreateCredentialData = {
      person: {
        fullName: dto.fullName,
        typeIdentity: dto.typeIdentity,
        identityNumber: dto.identityNumber,
        birthDate: new Date(dto.birthDate),
        institutionalEmail: dto.institutionalEmail,
      },
      credentialTypeCode: dto.credentialTypeCode,
      rank: dto.rank,
      unit: dto.unit,
      details: dto.details,
      force: dto.force,
      sport: dto.sport,
      course: dto.course,
      grades: dto.grades,
      imagePath: this.localFileService.toStoragePath(file),
    };

    const created = await this.commandBus.execute(
      new CreateCredentialCommand(data),
    );

    return CredentialResponseDto.fromDomain(created);
  }

  @Get(":id")
  @ApiOkResponse({ type: CredentialResponseDto })
  async get(@Param("id") id: string): Promise<CredentialResponseDto> {
    const found = await this.queryBus.execute(new GetCredentialQuery(id));
    if (!found) {
      throw new NotFoundException("Credential not found");
    }
    return CredentialResponseDto.fromDomain(found);
  }

  @Get()
  @ApiOkResponse({ description: 'Paginated list of credentials' })
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = parseInt(page as string, 10);
    const parsedLimit = parseInt(limit as string, 10);
    const pageNumber = isNaN(parsedPage) ? 1 : parsedPage;
    const limitNumber = isNaN(parsedLimit) ? 10 : parsedLimit;
    
    const result = await this.queryBus.execute(new ListCredentialsQuery(pageNumber, limitNumber));
    
    return {
      data: result.data.map((item: any) => CredentialResponseDto.fromDomain(item)),
      total: result.total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(result.total / limitNumber),
    };
  }
}
