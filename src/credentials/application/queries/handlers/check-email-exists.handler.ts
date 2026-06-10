import { Inject } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import {
  PERSON_REPOSITORY,
  PersonRepository,
} from "../../../domain/person.repository";
import { CheckEmailExistsQuery } from "../check-email-exists.query";

@QueryHandler(CheckEmailExistsQuery)
export class CheckEmailExistsHandler
  implements IQueryHandler<CheckEmailExistsQuery>
{
  constructor(
    @Inject(PERSON_REPOSITORY)
    private readonly personRepository: PersonRepository,
  ) {}

  async execute(query: CheckEmailExistsQuery): Promise<boolean> {
    return this.personRepository.existsByInstitutionalEmail(query.email);
  }
}
