package com.mycompany.myapp.domain;

import com.mycompany.myapp.domain.enumeration.ProspectOutcomeType;
import com.mycompany.myapp.domain.enumeration.ProspectSource;
import jakarta.persistence.*;
import java.io.Serializable;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/** Compteur anonyme (aucune donnée personnelle) : source → issue, et délai avant décision. */
@Getter
@Setter
@Entity
@Table(name = "prospect_outcome")
public class ProspectOutcome implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", length = 20, nullable = false)
    private ProspectSource source;

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", length = 20, nullable = false)
    private ProspectOutcomeType outcome;

    @Column(name = "days_to_decision")
    private Integer daysToDecision;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt = Instant.now();
}
