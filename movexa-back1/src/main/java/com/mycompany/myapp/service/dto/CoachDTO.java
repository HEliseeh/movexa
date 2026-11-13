package com.mycompany.myapp.service.dto;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

/**
 * Fiche coach.
 * @param memberCount nombre de membres suivis (lecture seule)
 */
public record CoachDTO(
    Long id,
    @NotBlank(message = "Le prénom du coach est obligatoire") @Size(max = 100) String firstName,
    @Size(max = 100) String lastName,
    @Size(max = 30) String phone,
    @Email(message = "Adresse e-mail invalide") @Size(max = 150) String email,
    @Size(max = 300, message = "300 caractères maximum") String notes,
    Boolean active,
    @Size(max = 15, message = "15 disciplines au maximum") List<@NotBlank @Size(max = 60) String> disciplines,
    Long memberCount,
    Instant createdAt
) {}
