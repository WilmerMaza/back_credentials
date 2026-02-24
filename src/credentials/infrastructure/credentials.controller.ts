import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UploadedFile,
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
@Controller("credentials")
export class CredentialsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly localFileService: LocalFileService
  ) {}

  @Post()
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: CreateCredentialRequestDto })
  @ApiCreatedResponse({ type: CredentialResponseDto })
  @UseInterceptors(FileInterceptor("image", multerOptions))
  async create(
    @Body() dto: CreateCredentialDto,
    @UploadedFile() file: Express.Multer.File
  ): Promise<CredentialResponseDto> {
    if (!file) {
      throw new BadRequestException("Image is required");
    }

    const data: CreateCredentialData = {
      fullName: dto.fullName,
      rank: dto.rank,
      identityNumber: dto.identityNumber,
      unit: dto.unit,
      birthDate: new Date(dto.birthDate),
      enlistmentDate: new Date(dto.enlistmentDate),
      institutionalEmail: dto.institutionalEmail,
      imagePath: this.localFileService.toStoragePath(file),
    };

    const created = await this.commandBus.execute(
      new CreateCredentialCommand(data)
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
  @ApiOkResponse({ type: [CredentialResponseDto] })
  async list(): Promise<CredentialResponseDto[]> {
    const items = await this.queryBus.execute(new ListCredentialsQuery());
    return items.map((item: any) => CredentialResponseDto.fromDomain(item));
  }
}
