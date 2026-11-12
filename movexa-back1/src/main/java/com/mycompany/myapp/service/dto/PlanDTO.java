package com.mycompany.myapp.service.dto;

import jakarta.validation.constraints.*;

/**
 * Formule d'abonnement.
 * @param memberCount nombre de membres dont c'est la formule en cours (lecture seule)
 */
public record PlanDTO(
    Long id,
    @NotBlank(message = "Le nom de la formule est obligatoire") @Size(max = 100) String name,
    @NotNull(message = "Le prix est obligatoire") @Min(value = 0, message = "Le prix ne peut pas être négatif") Long price,
    @NotNull(message = "La durée est obligatoire") @Min(0) @Max(3660) Integer durationDays,
    Boolean active,
    Long memberCount
) {}
