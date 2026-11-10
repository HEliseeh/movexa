package com.mycompany.myapp.service.mapper;

import com.mycompany.myapp.domain.Member;
import com.mycompany.myapp.service.dto.MemberDTO;
import org.mapstruct.*;

/**
 * MapStruct génère l'implémentation (MemberMapperImpl) à la compilation.
 * Les @Mapping indiquent comment passer de member.user.firstName à dto.firstName, et inversement.
 */
@Mapper(componentModel = "spring")
public interface MemberMapper {
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "firstName", source = "user.firstName")
    @Mapping(target = "lastName", source = "user.lastName")
    @Mapping(target = "email", source = "user.email")
    @Mapping(target = "phone", source = "user.phone")
    @Mapping(target = "birthDate", source = "user.birthDate")
    @Mapping(target = "age", source = "user.age")
    @Mapping(target = "gender", source = "user.gender")
    @Mapping(target = "notes", source = "user.comment")
    MemberDTO toDto(Member member);

    /**
     * Recopie le formulaire dans un membre existant (et son user).
     * Un champ vidé dans le formulaire est bien vidé en base (pas de « null ignoré »),
     * sauf le statut et la reconduction qui gardent leur valeur s'ils ne sont pas envoyés.
     * Les champs calculés ou gérés par le serveur ne sont jamais écrasés.
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "memberNumber", ignore = true)
    @Mapping(target = "joinDate", ignore = true)
    @Mapping(target = "expiryDate", ignore = true)
    @Mapping(target = "lastVisitDate", ignore = true)
    @Mapping(target = "visitsLast30Days", ignore = true)
    @Mapping(target = "status", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "autoRenew", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "user.id", ignore = true)
    @Mapping(target = "user.firstName", source = "firstName")
    @Mapping(target = "user.lastName", source = "lastName")
    @Mapping(target = "user.email", source = "email")
    @Mapping(target = "user.phone", source = "phone")
    @Mapping(target = "user.birthDate", source = "birthDate")
    @Mapping(target = "user.gender", source = "gender")
    @Mapping(target = "user.comment", source = "notes")
    @Mapping(target = "user.age", ignore = true)
    @Mapping(target = "user.weight", ignore = true)
    @Mapping(target = "user.height", ignore = true)
    @Mapping(target = "user.status", ignore = true)
    @Mapping(target = "user.dateOfCreation", ignore = true)
    void update(@MappingTarget Member member, MemberDTO dto);
}
