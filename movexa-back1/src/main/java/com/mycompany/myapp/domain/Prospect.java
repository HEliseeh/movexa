package com.mycompany.myapp.domain;

import com.mycompany.myapp.domain.enumeration.ProspectSource;
import com.mycompany.myapp.domain.enumeration.ProspectStatus;
import jakarta.persistence.*;
import java.io.Serializable;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/**
 * Personne intéressée qui n'est pas encore membre (ni abonnement, ni paiement, ni pointage).
 * Sa chance d'adhésion (score) monte quand elle interagit et baisse chaque jour sans nouvelles.
 */
@Getter
@Setter
@Entity
@Table(name = "prospect")
public class Prospect implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", length = 150)
    private String name;

    @Column(name = "phone", length = 20, nullable = false)
    private String phone;

    @Column(name = "phone_digits", length = 20, nullable = false)
    private String phoneDigits;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", length = 20, nullable = false)
    private ProspectSource source;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private ProspectStatus status = ProspectStatus.NEW;

    @Column(name = "first_contact_date", nullable = false)
    private LocalDate firstContactDate;

    @Column(name = "interested_plan", length = 100)
    private String interestedPlan;

    @Column(name = "notes", length = 500)
    private String notes;

    /** Chance d'adhésion, de 0 à 100. */
    @Column(name = "score", nullable = false)
    private Integer score;

    /** Dernier signe d'intérêt du prospect : point de départ du délai de grâce. */
    @Column(name = "last_interaction_at", nullable = false)
    private Instant lastInteractionAt = Instant.now();

    @Column(name = "next_follow_up")
    private LocalDate nextFollowUp;

    /** 0 = aucune relance, 1 = J+1 faite, 2 = J+3 faite, 3 = J+7 faite. */
    @Column(name = "follow_up_step", nullable = false)
    private Integer followUpStep = 0;

    @Column(name = "converted_member_id")
    private Long convertedMemberId;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "created_by", length = 100)
    private String createdBy;

    public boolean isClosed() {
        return status == ProspectStatus.CONVERTED || status == ProspectStatus.LOST;
    }
}
