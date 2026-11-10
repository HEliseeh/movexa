package com.mycompany.myapp.service.dto;

import com.mycompany.myapp.domain.enumeration.Gender;
import com.mycompany.myapp.domain.enumeration.MemberStatus;
import jakarta.validation.constraints.*;
import java.io.Serializable;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Ce que l'API expose pour un membre : les champs du Member et ceux de son User « à plat »,
 * pour que le front n'ait pas à manipuler deux objets.
 * Les règles de validation reprennent celles du formulaire (le backend fait foi).
 */
@Getter
@Setter
@NoArgsConstructor
public class MemberDTO implements Serializable {

    /** Téléphone : chiffres, espaces, points, tirets, + au début ; au moins 8 caractères. */
    public static final String PHONE_REGEX = "^\\+?[0-9][0-9 .-]{6,18}[0-9]$";

    private Long id;

    /** Généré par le serveur à la création, ignoré en écriture. */
    private String memberNumber;

    // ---- Champs du User ----
    private Long userId;

    @NotBlank(message = "Le prénom est obligatoire")
    @Size(max = 100)
    private String firstName;

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 100)
    private String lastName;

    @Email(message = "Adresse e-mail invalide")
    @Size(max = 254)
    private String email;

    @NotBlank(message = "Le téléphone est obligatoire")
    @Pattern(regexp = PHONE_REGEX, message = "Numéro de téléphone invalide")
    private String phone;

    @Past(message = "La date de naissance doit être dans le passé")
    private LocalDate birthDate;

    /** Calculé à partir de la date de naissance, ignoré en écriture. */
    private Integer age;

    private Gender gender;

    /** Notes internes pour l'équipe (stockées dans le commentaire du user). */
    @Size(max = 300)
    private String notes;

    // ---- Champs du Member ----
    /** Facultatif à la création (ACTIVE par défaut). */
    private MemberStatus status;

    @NotBlank(message = "La formule est obligatoire")
    @Size(max = 100)
    private String plan;

    @Size(max = 100)
    private String coach;

    @Size(max = 150)
    private String program;

    @NotNull(message = "La date de début est obligatoire")
    private LocalDate subscriptionStartDate;

    private Boolean autoRenew;

    /** Date d'inscription : fixée par le serveur. */
    private LocalDate joinDate;

    /** Calculée par le serveur (date de début + durée de la formule). */
    private LocalDate expiryDate;

    /** En lecture seule : alimentés plus tard par le module Access. */
    private LocalDate lastVisitDate;

    private Integer visitsLast30Days;
}
