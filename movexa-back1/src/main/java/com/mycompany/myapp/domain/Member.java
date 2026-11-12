package com.mycompany.myapp.domain;

import com.mycompany.myapp.domain.enumeration.MemberStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.io.Serializable;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/**
 * Adhésion d'une personne à la salle.
 * Un membre EST un {@link User} : l'identité (nom, contact...) est dans app_user,
 * ce qui est propre à l'adhésion (formule, échéance, coach...) est ici.
 */
@Getter
@Setter
@Entity
@Table(name = "member")
public class Member implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    private Long id;

    /** Numéro lisible affiché dans l'interface, ex. A-0042. Généré à la création. */
    @Size(max = 20)
    @Column(name = "member_number", length = 20, unique = true)
    private String memberNumber;

    /** Relation 1-1 : créer/modifier un membre crée/modifie aussi son user. */
    @NotNull
    @OneToOne(optional = false, fetch = FetchType.LAZY, cascade = { CascadeType.PERSIST, CascadeType.MERGE })
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private MemberStatus status;

    @Size(max = 100)
    @Column(name = "plan", length = 100)
    private String plan;

    @Size(max = 100)
    @Column(name = "coach", length = 100)
    private String coach;

    @Size(max = 150)
    @Column(name = "program", length = 150)
    private String program;

    @NotNull
    @Column(name = "join_date", nullable = false)
    private LocalDate joinDate;

    /** Début de la période d'abonnement en cours (sert à calculer l'échéance). */
    @NotNull
    @Column(name = "subscription_start_date", nullable = false)
    private LocalDate subscriptionStartDate;

    @Column(name = "auto_renew", nullable = false)
    private boolean autoRenew = false;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "last_visit_date")
    private LocalDate lastVisitDate;

    @NotNull
    @Min(0)
    @Column(name = "visits_last_30_days", nullable = false)
    private Integer visitsLast30Days = 0;

    /** Contenu du QR code personnel : aléatoire, pour qu'on ne puisse pas le deviner à partir du numéro. */
    @Column(name = "qr_token", length = 40, unique = true)
    private String qrToken;

    /** Un membre « supprimé » est archivé : ses paiements et passages restent consultables. */
    @Column(name = "archived", nullable = false)
    private boolean archived = false;

    @PrePersist
    void onCreate() {
        if (joinDate == null) {
            joinDate = LocalDate.now();
        }
        if (subscriptionStartDate == null) {
            subscriptionStartDate = joinDate;
        }
        if (qrToken == null) {
            qrToken = java.util.UUID.randomUUID().toString().replace("-", "");
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Member)) return false;
        return id != null && id.equals(((Member) o).id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
