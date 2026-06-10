import { Inject } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import {
  PERSON_REPOSITORY,
  PersonRepository,
} from "../../../domain/person.repository";
import { CheckIdentityExistsQuery } from "../check-identity-exists.query";

@QueryHandler(CheckIdentityExistsQuery)
export class CheckIdentityExistsHandler
  implements IQueryHandler<CheckIdentityExistsQuery>
{
  constructor(
    @Inject(PERSON_REPOSITORY)
    private readonly personRepository: PersonRepository,
  ) {}

  async execute(query: CheckIdentityExistsQuery): Promise<boolean> {
    return this.personRepository.existsByIdentityNumber(query.identityNumber);
  }
}
