package com.mycompany.myapp.service.mapper;

import com.mycompany.myapp.domain.Member;
import com.mycompany.myapp.service.dto.MemberDTO;
import org.mapstruct.*;

/**
 * MapStruct génère l'implémentation (MemberMapperImpl) à la compilation.
 * Les @Mapping indiquent comment passer de member.user.firstName à dto.firstName, et inversement.
 * Les champs calculés (state, daysLeft…) sont remplis par MemberService après la conversion.
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
    @Mapping(target = "state", ignore = true)
    @Mapping(target = "daysLeft", ignore = true)
    @Mapping(target = "planId", ignore = true)
    @Mapping(target = "paymentMethod", ignore = true)
    @Mapping(target = "planStartDate", ignore = true)
    @Mapping(target = "prospectId", ignore = true)
    @Mapping(target = "payment", ignore = true)
    MemberDTO toDto(Member member);

    /**
     * Recopie le formulaire dans un membre existant (et son user).
     * Seuls l'identité, le contact et les notes viennent du formulaire : la formule, les dates
     * et le QR code sont gérés par le serveur (encaissements, pointage).
     * Les champs absents du formulaire actuel (date de naissance, genre…) gardent leur valeur.
     * Le coach est posé par MemberService (vérification de la fiche coach).
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "memberNumber", ignore = true)
    @Mapping(target = "joinDate", ignore = true)
    @Mapping(target = "expiryDate", ignore = true)
    @Mapping(target = "lastVisitDate", ignore = true)
    @Mapping(target = "visitsLast30Days", ignore = true)
    @Mapping(target = "plan", ignore = true)
    @Mapping(target = "subscriptionStartDate", ignore = true)
    @Mapping(target = "qrToken", ignore = true)
    @Mapping(target = "archived", ignore = true)
    @Mapping(target = "status", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "autoRenew", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "coach", ignore = true)
    @Mapping(target = "coachId", ignore = true)
    @Mapping(target = "program", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "user.id", ignore = true)
    @Mapping(target = "user.firstName", source = "firstName")
    @Mapping(target = "user.lastName", source = "lastName")
    @Mapping(target = "user.email", source = "email")
    @Mapping(target = "user.phone", source = "phone")
    @Mapping(target = "user.birthDate", source = "birthDate", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "user.gender", source = "gender", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "user.comment", source = "notes")
    @Mapping(target = "user.age", ignore = true)
    @Mapping(target = "user.weight", ignore = true)
    @Mapping(target = "user.height", ignore = true)
    @Mapping(target = "user.status", ignore = true)
    @Mapping(target = "user.dateOfCreation", ignore = true)
    @Mapping(target = "user.phoneDigits", ignore = true)
    void update(@MappingTarget Member member, MemberDTO dto);
}
